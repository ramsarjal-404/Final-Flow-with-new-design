import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import type { IconName } from '../ui';

/* ENT-SET-SettingsCategory, order from information-architecture.md § 3. Each category is its own
   folder under ./categories/<id>/ with an index.tsx default export. */
export type Category = { id: string; label: string; title?: string; icon: IconName; module: 'SDS' | 'SAD'; listed: boolean; Page: LazyExoticComponent<ComponentType> };

const c = (id: string, label: string, icon: IconName, module: 'SDS' | 'SAD', Page: LazyExoticComponent<ComponentType>, title?: string, listed = true): Category =>
  ({ id, label, icon, module, Page, title, listed });

export const CATEGORIES: Category[] = [
  c('add-data-source', 'Add Data Source', 'plug', 'SDS', lazy(() => import('./categories/add-data-source'))),
  c('trust', 'Trust Settings', 'shield', 'SDS', lazy(() => import('./categories/trust'))),
  c('identify', 'Identify Settings', 'search', 'SDS', lazy(() => import('./categories/identify'))),
  c('protect', 'Protect Settings', 'lock', 'SDS', lazy(() => import('./categories/protect')), 'Configure Team Members'),
  c('general', 'General Settings', 'sliders', 'SAD', lazy(() => import('./categories/general'))),
  c('role-management', 'Role management', 'users', 'SAD', lazy(() => import('./categories/role-management')), 'Role Management'),
  c('lepide-iq', 'Lepide IQ', 'sparkles', 'SAD', lazy(() => import('./categories/lepide-iq'))),
  c('logs', 'Logs', 'list', 'SAD', lazy(() => import('./categories/logs'))),
  c('backup-restore', 'Backup & Restore', 'archive', 'SAD', lazy(() => import('./categories/backup-restore'))),
  c('exported-files', 'Exported Files', 'download', 'SAD', lazy(() => import('./categories/exported-files'))),
  c('application-url', 'Application URL', 'link', 'SAD', lazy(() => import('./categories/application-url'))),
  c('manage-domains', 'Manage Domains', 'globe', 'SAD', lazy(() => import('./categories/manage-domains'))),
  c('subscription', 'Subscription', 'send', 'SAD', lazy(() => import('./categories/subscription'))),
  c('configure-notifications', 'Configure Notifications', 'bell', 'SAD', lazy(() => import('./categories/configure-notifications'))),
  c('license-management', 'License Management', 'key', 'SAD', lazy(() => import('./categories/license-management'))),
  c('sql-authentication', 'SQL Authentication', 'database', 'SAD', lazy(() => import('./categories/sql-authentication'))),
  c('user-service-settings', 'User Service Settings', 'user', 'SAD', lazy(() => import('./categories/user-service-settings'))),
  // Routed without a Categories entry (GAP-SET-01): reached from Add Data Source.
  c('manage-component', 'Manage Component', 'layers', 'SDS', lazy(() => import('./categories/manage-component')), undefined, false),
];

export const categoryById = (id: string | undefined) => CATEGORIES.find((x) => x.id === id);
