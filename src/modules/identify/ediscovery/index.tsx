import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useToast } from '../../../ui';
import { setNotifier, startScheduler } from './store';
import { BASE } from './parts';
import CasesPage from './CasesPage';
import SearchPage from './SearchPage';
import { AgentsPage, LocationsPage } from './SettingsPages';
import './styles.css';

/* e-Discovery (MOD-IDN, SCR-IDN-04 … 07). Mounted by the Identify router at /identify/e-discovery/*.
   Unknown paths → Cases; unknown settings paths → Agents (FLW-IDN-03). */
export default function EDiscovery() {
  const toast = useToast();
  useEffect(() => { setNotifier(toast); startScheduler(); }, [toast]);
  return (
    <Routes>
      <Route index element={<CasesPage />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="settings/agents" element={<AgentsPage />} />
      <Route path="settings/locations" element={<LocationsPage />} />
      <Route path="settings/*" element={<Navigate to={`${BASE}/settings/agents`} replace />} />
      <Route path="*" element={<Navigate to={BASE} replace />} />
    </Routes>
  );
}
