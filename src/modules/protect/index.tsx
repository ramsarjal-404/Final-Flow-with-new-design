/* MOD-PRO Protect — owns every route under /protect (information-architecture.md § 2). */
import type { ComponentType } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import OverviewPage from './Overview';
import PolicyManagement from './Policies';
import CleanerWizard from './CleanerWizard';
import PermissionWizard from './PermissionWizard';
import AdCleanerPage from './AdCleaner';
import ReportViewer from './ReportViewer';
import TeamManagement from './TeamManagement';
import './styles.css';

export default function Protect() {
  return (
    <Routes>
      <Route index element={<OverviewPage />} />
      <Route path="policies" element={<PolicyManagement />} />
      <Route path="policies/new" element={<Keyed C={CleanerWizard} />} />
      <Route path="policies/new-permission" element={<Keyed C={PermissionWizard} />} />
      <Route path="ad-cleaner" element={<AdCleanerPage />} />
      <Route path="ad-cleaner/report" element={<Keyed C={ReportViewer} />} />
      <Route path="team-management" element={<TeamManagement />} />
      <Route path="*" element={<Navigate to="/protect" replace />} />
    </Routes>
  );
}

/** Wizards restart when their query (create vs ?edit=) changes. */
function Keyed({ C }: { C: ComponentType }) {
  const loc = useLocation();
  return <C key={loc.search} />;
}
