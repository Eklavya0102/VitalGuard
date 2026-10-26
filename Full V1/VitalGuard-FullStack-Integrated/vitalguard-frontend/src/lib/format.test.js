import test from 'node:test';
import assert from 'node:assert/strict';
import { fmt, pct, titleCase, analysisSourceFor, sourceInfo, toCsv, DISCLAIMER } from './format.js';
import { extractError } from '../api.js';

test('fmt / pct handle missing values', () => {
  assert.equal(fmt(null), '—');
  assert.equal(fmt(undefined), '—');
  assert.equal(fmt(1.234, 2), '1.23');
  assert.equal(pct(0.5), '50.0%');
  assert.equal(pct('x'), '—');
});

test('titleCase', () => assert.equal(titleCase('abrupt_pulse_change'), 'Abrupt Pulse Change'));

test('analysisSourceFor never sends a value /analyze would reject', () => {
  assert.equal(analysisSourceFor('python_fallback'), 'python');
  assert.equal(analysisSourceFor('matlab'), 'matlab');
  assert.equal(analysisSourceFor('upload'), 'upload');
  assert.equal(analysisSourceFor('python'), 'python');
});

test('sourceInfo distinguishes simulated from uploaded', () => {
  assert.equal(sourceInfo('python').kind, 'simulated');
  assert.equal(sourceInfo('python_fallback').kind, 'simulated');
  assert.equal(sourceInfo('upload').kind, 'uploaded');
  assert.equal(sourceInfo(null).kind, 'none');
});

test('toCsv quotes fields and renders null as empty', () => {
  assert.equal(toCsv([{ a: 1, b: null }, { a: 'x,y', b: 'q"r' }]), 'a,b\n1,\n"x,y","q""r"');
  assert.equal(toCsv([]), '');
});

test('extractError handles string, validation array and message bodies', () => {
  assert.equal(extractError({ detail: 'Missing required columns: a' }, 400), 'Missing required columns: a');
  assert.equal(
    extractError({ detail: [{ loc: ['body', 'source'], msg: "Input should be 'matlab', 'python' or 'upload'" }] }, 422),
    "source: Input should be 'matlab', 'python' or 'upload'",
  );
  assert.equal(extractError({ message: 'boom' }, 500), 'boom');
  assert.equal(extractError(null, 503), 'Request failed (HTTP 503)');
});

test('required disclaimer text is exact', () => {
  assert.equal(
    DISCLAIMER,
    'VitalGuard is a simulation-based research prototype. Its outputs are intended for signal-quality research and demonstration, not standalone clinical diagnosis or treatment decisions. The configured physiological ranges have not been established as age-specific clinical reference standards.',
  );
});
