import { Route, Routes } from 'react-router-dom';
import { ReportModuleRoutes } from '../../reports';
import EDiscovery from './ediscovery';
import { IDENTIFY_MODULE } from './reports/config';
import FileViewPage from './reports/FileViewPage';
import './reports/styles.css';

/* Identify (MOD-IDN) router. Owns every route under /identify/*.
   - e-Discovery: ./ediscovery (SCR-IDN-04 … 07).
   - Reports (./reports): the shared Report Library routes configured by IDENTIFY_MODULE — hub (SCR-IDN-01,
     index), builder (SCR-IDN-08, reports/new), the classified file view (SCR-IDN-03,
     reports/classified-files/file, declared before reports/:slug) and the generic view with the Preview
     cell (SCR-IDN-02, reports/:slug). Anything else → /identify. The wrapper (display: contents) only
     scopes the Identify styles (brand tree report rows). */
export default function Identify() {
  return (
    <Routes>
      <Route path="e-discovery/*" element={<EDiscovery />} />
      <Route path="*" element={
        <div className="idn-scope">
          <ReportModuleRoutes module={IDENTIFY_MODULE}>
            <Route path="reports/classified-files/file" element={<FileViewPage />} />
          </ReportModuleRoutes>
        </div>
      } />
    </Routes>
  );
}
