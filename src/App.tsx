import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './app/auth';
import { ConsoleShell } from './app/Shell';
import { PageLoader } from './ui';
import Login from './pages/Login';
import Home from './pages/Home';
import SettingsFrame from './settings/SettingsFrame';
import { MODULE_ROUTES } from './modules/registry';

/* Router (modules/platform/screens.md § Router-level behaviour, information-architecture.md § 2). */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><ConsoleShell /></RequireAuth>}>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Navigate to="/settings/role-management" replace />} />
        <Route path="/settings/:category/*" element={<SettingsFrame />} />
        {MODULE_ROUTES.map(({ path, Page }) => (
          <Route key={path} path={path} element={<Suspense fallback={<PageLoader />}><Page /></Suspense>} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
