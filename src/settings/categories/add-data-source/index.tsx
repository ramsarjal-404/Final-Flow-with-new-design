import { Navigate, Route, Routes } from 'react-router-dom';
import Picker from './Picker';
import FileServers from './FileServers';
import ActiveDirectory from './ActiveDirectory';
import ServerDetail from './ServerDetail';
import AuditRules from './AuditRules';
import UserGroups from './UserGroups';
import GeneralSettings from './GeneralSettings';
import './styles.css';

/* Category `add-data-source` (MOD-SDS screens/add-data-source.md § Routing). `rules`, `users`,
   `general` are matched before `:id`; anything else returns to the root (replace). */
export default function AddDataSourcePage() {
  return (
    <Routes>
      <Route index element={<Picker />} />
      <Route path="active-directory" element={<ActiveDirectory />} />
      <Route path="file-server" element={<FileServers />} />
      <Route path="file-server/rules" element={<AuditRules />} />
      <Route path="file-server/users" element={<UserGroups />} />
      <Route path="file-server/general" element={<GeneralSettings />} />
      <Route path="file-server/:id" element={<ServerDetail />} />
      <Route path="*" element={<Navigate to="/settings/add-data-source" replace />} />
    </Routes>
  );
}
