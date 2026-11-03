import { Navigate, Route, Routes } from 'react-router-dom';
import AlertConfiguration from './AlertConfiguration';
import AlertStatus from './AlertStatus';
// Detect Dashboard (SCR-DET-04) is shown inside Dashboards at /dashboards/detect.
import './styles.css';

/* MOD-DET · Detect. Routes (information-architecture.md § 2): /detect (Alert Configuration, tab in
   router state) and /detect/alert-status. SCR-DET-04 has no route in the IA (GAP-DET-13); it is
   mounted at /detect/dashboard. DLG-DET-20 (flyout) is provided by the shell sidebar. */
export default function DetectModule() {
  return (
    <Routes>
      <Route index element={<AlertConfiguration />} />
      <Route path="alert-status" element={<AlertStatus />} />
      <Route path="dashboard" element={<Navigate to="/dashboards/detect" replace />} />
      <Route path="*" element={<Navigate to="/detect" replace />} />
    </Routes>
  );
}
