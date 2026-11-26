/* AI Shield module routes (mounted at /shield/* in src/modules/registry.ts). Flow docs: flows/ai-shield/FLOW.md. */
import './shield.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Activity } from './Activity';
import { Overview } from './Overview';
import { People } from './People';
import { Policy } from './Policy';
import { Server } from './Server';
import { Sessions } from './Sessions';

export default function ShieldRoutes() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="sessions" element={<Sessions />} />
      <Route path="people" element={<People />} />
      <Route path="policy" element={<Policy />} />
      <Route path="activity" element={<Activity />} />
      <Route path="server" element={<Server />} />
      <Route path="*" element={<Navigate to="/shield" replace />} />
    </Routes>
  );
}
