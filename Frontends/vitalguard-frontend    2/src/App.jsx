import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Overview from './pages/Overview';
import Analysis from './pages/Analysis';
import Simulation from './pages/Simulation';
import ImportData from './pages/ImportData';
import Reports from './pages/Reports';
import Status from './pages/Status';
import About from './pages/About';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Overview />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="simulation" element={<Simulation />} />
        <Route path="import" element={<ImportData />} />
        <Route path="reports" element={<Reports />} />
        <Route path="status" element={<Status />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
