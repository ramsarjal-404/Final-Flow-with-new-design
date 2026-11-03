import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../app/auth';
import ListPage from './ListPage';
import ViewPage from './ViewPage';
import { CreateEditor, CustomizeEditor } from './EditorPage';
import './styles.css';

/* MOD-DSH · Dashboards (modules/dashboards). Routes: /dashboards, /dashboards/new, /dashboards/:id,
   /dashboards/:id/edit; any other path under /dashboards → /dashboards. */
export default function DashboardsModule() {
  const { hasPermission } = useAuth();
  // GAP-DSH-15 intended rule: without Dashboard.Predefined.Access, /dashboards/* is not reachable.
  if (!hasPermission('Dashboard.Predefined.Access')) return <Navigate to="/" replace />;
  return (
    <Routes>
      <Route index element={<ListPage />} />
      <Route path="new" element={<CreateEditor />} />
      <Route path=":id" element={<ViewPage />} />
      <Route path=":id/edit" element={<CustomizeEditor />} />
      <Route path="*" element={<Navigate to="/dashboards" replace />} />
    </Routes>
  );
}
