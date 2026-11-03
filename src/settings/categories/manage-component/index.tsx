import { Navigate, Route, Routes } from 'react-router-dom';
import { ManageComponents } from './ManagePanel';

/* Category `manage-component` (GAP-SET-01 intended: a sub-page of Add Data Source whose route stays).
   It shows the Manage Components panel (SCR-SDS-08) on its own; the same panel and store also
   appear under the Add Data Source picker. Unknown sub-paths return to the root (replace). */
export default function ManageComponentPage() {
  return (
    <Routes>
      <Route index element={<ManageComponents />} />
      <Route path="*" element={<Navigate to="/settings/manage-component" replace />} />
    </Routes>
  );
}
