"""Tests for the AI explanation service and routes (no network, fake Groq client)."""
import json
from types import SimpleNamespace

import pytest

from app.services.ai_analysis import AIAnalysisError, AIAnalysisService

GOOD = {
    "title": "t",
    "summary": "s",
    "findings": ["a"],
    "limitations": ["b"],
    "recommended_checks": ["c"],
    "disclaimer": "d",
}


class FakeClient:
    def __init__(self, content=None, error=None):
        self._content, self._error = content, error
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        if self._error:
            raise self._error
        message = SimpleNamespace(content=self._content)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def service_with(content=None, error=None):
    svc = AIAnalysisService()
    svc._client = FakeClient(content, error)
    return svc


def test_valid_response_is_labelled_synthetic_and_not_clinical():
    out = service_with(json.dumps(GOOD)).analyze("report", {"x": 1})
    assert out["provider"] == "groq"
    assert out["synthetic_data"] is True
    assert out["clinical_validation"] is False


def test_missing_key_raises_clear_error(monkeypatch):
    from app.services import ai_analysis

    monkeypatch.setattr(ai_analysis.settings, "GROQ_API_KEY", "")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(AIAnalysisError, match="not configured"):
        AIAnalysisService().analyze("report", {"x": 1})


def test_key_from_settings_is_used(monkeypatch):
    from app.services import ai_analysis

    monkeypatch.setattr(ai_analysis.settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(ai_analysis, "Groq", lambda **kw: FakeClient(json.dumps(GOOD)))
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert AIAnalysisService().analyze("patterns", {"x": 1})["title"] == "t"


@pytest.mark.parametrize("content", ["", "not json", json.dumps({"title": "x"}),
                                     json.dumps({**GOOD, "findings": "no"})])
def test_bad_model_output_is_rejected(content):
    with pytest.raises(AIAnalysisError):
        service_with(content).analyze("report", {"x": 1})


def test_provider_failure_is_wrapped():
    with pytest.raises(AIAnalysisError, match="temporarily unavailable"):
        service_with(error=RuntimeError("boom")).analyze("report", {"x": 1})


def test_oversized_payload_and_unknown_task_rejected():
    with pytest.raises(AIAnalysisError, match="exceeds"):
        service_with(json.dumps(GOOD)).analyze("report", {"x": "a" * 25000})
    with pytest.raises(AIAnalysisError, match="Unsupported"):
        service_with(json.dumps(GOOD)).analyze("nope", {"x": 1})


def test_routes_return_503_when_unconfigured_and_422_on_bad_body(monkeypatch):
    from fastapi.testclient import TestClient

    from app.api import routes
    from app.main import app

    monkeypatch.setattr(routes.ai_analysis_service, "_client", None)
    monkeypatch.setattr(routes.ai_analysis_service.__class__, "_get_client",
                        lambda self: (_ for _ in ()).throw(AIAnalysisError("Groq is not configured.")))
    client = TestClient(app)
    r = client.post("/api/v1/ai/report", json={"payload": {"x": 1}})
    assert r.status_code == 503 and "not configured" in r.json()["detail"]
    assert client.post("/api/v1/ai/report", json={}).status_code == 422
    assert client.post("/api/v1/ai/compare", json={"baseline": {}}).status_code == 422
