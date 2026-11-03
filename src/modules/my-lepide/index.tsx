import { Navigate, Route, Routes } from 'react-router-dom';
import MyLepidePage from './MyLepidePage';
import './styles.css';

/* MOD-MYL: one route, /my-lepide (SCR-MYL-01). Anything deeper redirects to the page. */
export default function MyLepide() {
  return (
    <Routes>
      <Route index element={<MyLepidePage />} />
      <Route path="*" element={<Navigate to="/my-lepide" replace />} />
    </Routes>
  );
}
