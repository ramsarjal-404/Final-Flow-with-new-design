import { ReportModuleRoutes } from '../../reports';
import { TRUST_MODULE } from './config';
import PermissionsByUser from './PermissionsByUser';
import PermissionsByObject from './PermissionsByObject';
import ExcessiveByUser from './ExcessiveByUser';
import ExcessiveByObject from './ExcessiveByObject';
import StaleData from './StaleData';
import AnomalyAnalysis from './AnomalyAnalysis';
import './styles.css';

/* MOD-TRU: every route under /trust — hub (SCR-TRU-01), builder (/trust/reports/new), the six deep
   reports on the shared deep-report frame (SCR-TRU-03 … SCR-TRU-10, declared before reports/:slug)
   and the generic view (SCR-TRU-02). Refresh / pasted links on report pages redirect to /trust.
   The legacy Overview / Dashboards / sub-navigation (SCR-TRU-11/12/13) are not routed. */
export default function Trust() {
  return (
    <ReportModuleRoutes module={TRUST_MODULE} dedicated={{
      'reports/permissions-by-user': <PermissionsByUser />,
      'reports/permissions-by-object': <PermissionsByObject />,
      'reports/excessive-permissions-by-user': <ExcessiveByUser />,
      'reports/excessive-permissions-by-object': <ExcessiveByObject />,
      'reports/stale-data-report': <StaleData />,
      'reports/anomaly-analysis': <AnomalyAnalysis />,
    }} />
  );
}
