// @ts-nocheck — ported from the live prototype (https://lepide-new-ui.vercel.app/shield); shapes are in ./types.ts.
/* AI Shield module routes (mounted at /shield/* in src/modules/registry.ts). */
import './shield.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Overview } from './Overview';
import { Sessions } from './Sessions';
import { People } from './People';
import { Policy } from './Policy';
import { Activity } from './Activity';
import { Server } from './Server';

function ShieldRoutes() {
  return (
    <Routes>
      <Route index={!0} element={<Overview />} />
      <Route path="sessions" element={<Sessions />} />
      <Route path="people" element={<People />} />
      <Route path="policy" element={<Policy />} />
      <Route path="activity" element={<Activity />} />
      <Route path="server" element={<Server />} />
      <Route path="*" element={<Navigate to="/shield" replace={!0} />} />
    </Routes>
  );
}
export default ShieldRoutes;
