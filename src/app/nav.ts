import type { IconName, ModuleIconName } from '../ui';
import type { Permission } from './auth';

/* ENT-PLAT-NavigationItem + Lepide Design System grouping (ui-design-system/02 § 2.3). */
export type NavKey = 'home' | 'lepide-ai' | 'shield' | 'auditor' | 'trust' | 'detect' | 'protect' | 'identify' | 'mylepide' | 'dashboards' | 'settings';
export type NavItem = {
  key: NavKey; label: string; path: string; icon: ModuleIconName | null; group?: 'Assistant' | 'Modules' | 'Workspace';
  permission?: Permission; menu?: { label: string; path: string; icon: IconName }[];
};

export const NAV: NavItem[] = [
  { key: 'lepide-ai', label: 'Lepide AI', path: '/lepide-ai', icon: 'ai', group: 'Assistant' },
  { key: 'shield', label: 'AI Shield', path: '/shield', icon: 'shield', group: 'Modules',
    menu: [{ label: 'Sessions', path: '/shield/sessions', icon: 'sparkles' }, { label: 'People', path: '/shield/people', icon: 'users' }, { label: 'Protection policy', path: '/shield/policy', icon: 'shield' }] },
  { key: 'auditor', label: 'Auditor', path: '/auditor', icon: 'auditor', group: 'Modules', permission: 'Auditor.Reports.Predefined.View' },
  { key: 'trust', label: 'Trust', path: '/trust', icon: 'trust', group: 'Modules', permission: 'Trust.Reports.View' },
  { key: 'detect', label: 'Detect', path: '/detect', icon: 'detect', group: 'Modules', permission: 'Detect.Alerts.Predefined.Access',
    menu: [{ label: 'Alert Status', path: '/detect/alert-status', icon: 'bell' }] },
  { key: 'protect', label: 'Protect', path: '/protect', icon: 'protect', group: 'Modules', permission: 'Protect.Access',
    menu: [{ label: 'Team Management', path: '/protect/team-management', icon: 'users' }, { label: 'Policy Management', path: '/protect/policies', icon: 'clipboard' }] },
  { key: 'identify', label: 'Identify', path: '/identify', icon: 'identify', group: 'Modules', permission: 'EDiscovery.Cases.View',
    menu: [{ label: 'e-Discovery', path: '/identify/e-discovery', icon: 'search' }] },
  { key: 'mylepide', label: 'My Lepide', path: '/my-lepide', icon: 'mylepide', group: 'Workspace', permission: 'MyLepide.Access' },
  { key: 'dashboards', label: 'Dashboards', path: '/dashboards', icon: 'dashboards', group: 'Workspace', permission: 'Dashboard.Predefined.Access' },
];

/** Current item by route prefix (shared/navigation-contracts.md § 1). */
export function currentKey(path: string): NavKey | null {
  if (path === '/') return 'home';
  if (path.startsWith('/settings')) return 'settings';
  const hit: Record<string, NavKey> = { '/lepide-ai': 'lepide-ai', '/shield': 'shield', '/auditor': 'auditor', '/trust': 'trust', '/detect': 'detect', '/protect': 'protect', '/identify': 'identify', '/my-lepide': 'mylepide', '/dashboards': 'dashboards' };
  const k = Object.keys(hit).find((p) => path === p || path.startsWith(p + '/'));
  return k ? hit[k] : null;
}
