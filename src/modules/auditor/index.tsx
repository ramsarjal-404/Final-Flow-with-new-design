import { ReportModuleRoutes } from '../../reports';
import { AUDITOR_MODULE } from './config';
import CopilotPage from './CopilotPage';
import './styles.css';

/* MOD-AUD: every route under /auditor — hub (SCR-AUD-01), builder (SCR-AUD-03), the dedicated
   Data Accessed by Copilot page (SCR-AUD-04, declared before reports/:slug) and the generic view
   (SCR-AUD-02). Refresh / pasted links on the view, builder and Copilot page redirect to /auditor. */
export default function Auditor() {
  return <ReportModuleRoutes module={AUDITOR_MODULE} dedicated={{ 'reports/data-accessed-by-copilot': <CopilotPage /> }} />;
}
