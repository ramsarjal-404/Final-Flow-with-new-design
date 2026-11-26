import type { ComponentType } from 'react';
import type { ModuleIconName } from '@lepide/ds-react';

/* The golden example screens. Each React screen is page CONTENT (what goes inside the console shell's <main>),
   default-exported from screens/<File>.tsx; its static HTML twin is html/src/<id>.page.html → html/<id>.html. */
export type Screen = {
  id: string;
  title: string;
  /** Pattern it demonstrates (DESIGN.md §4.2). */
  pattern: string;
  icon: ModuleIconName;
  /** Rendered without the console shell (sign-in). */
  bare?: boolean;
  load: () => Promise<{ default: ComponentType }>;
};

export const screens: Screen[] = [
  { id: 'home', title: 'Home', pattern: 'Greeting, Lepide AI card with the orb, module tiles', icon: 'ai', load: () => import('./Home') },
  { id: 'dashboard', title: 'Dashboard', pattern: 'KPI row + chart panels', icon: 'dashboards', load: () => import('./Dashboard') },
  { id: 'report-hub', title: 'Reports hub', pattern: 'Folder tree + report table', icon: 'auditor', load: () => import('./ReportHub') },
  { id: 'alerts', title: 'Alerts', pattern: 'Filtered list → detail drawer → confirm → toast', icon: 'detect', load: () => import('./Alerts') },
  { id: 'users', title: 'Users', pattern: 'Admin list: KPIs, table, settings card', icon: 'trust', load: () => import('./Users') },
  { id: 'settings', title: 'Settings', pattern: 'Section nav + settings cards + form', icon: 'settings', load: () => import('./Settings') },
  { id: 'file-server', title: 'Add data source › File server', pattern: 'Settings page with tabs, actions card, grouped table, dialogs', icon: 'settings', load: () => import('./FileServer') },
  { id: 'e-discovery', title: 'e-Discovery', pattern: 'Tabs + sub-tabs, tables, create dialogs, confirm', icon: 'identify', load: () => import('./EDiscovery') },
  { id: 'wizard', title: 'Create policy wizard', pattern: 'Multi-step wizard with review', icon: 'protect', load: () => import('./Wizard') },
  { id: 'sign-in', title: 'Sign in', pattern: 'Sign-in card (no shell)', icon: 'ai', bare: true, load: () => import('./SignIn') },
];
