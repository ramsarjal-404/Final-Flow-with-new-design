import { useState } from 'react';
import { Segmented } from '../../../ui';
import { useSettingsTitle } from '../../SettingsFrame';
import { DeliverySettings } from './delivery';
import { DefaultSqlForm, GroupPolicySqlForm, MySqlForm } from './forms';
import '../configure-notifications/shared/shared.css';
import './styles.css';

/* SCR-SAD-17…20 · SQL Authentication. The four tabs are page state; the current tab's label is the
   heading of the content card (the Settings frame keeps the category title). */
const TABS = [
  { value: 'default', label: 'Default SQL Server settings' },
  { value: 'gp', label: 'Group Policy SQL settings' },
  { value: 'mysql', label: 'MySQL credentials' },
  { value: 'delivery', label: 'Manage delivery settings' },
] as const;
type Tab = (typeof TABS)[number]['value'];

export default function SqlAuthenticationPage() {
  const [tab, setTab] = useState<Tab>('default');
  const label = TABS.find((t) => t.value === tab)!.label;
  useSettingsTitle(label); // the page title is the current tab's label (spec)
  return (
    <>
      <div className="sql-authentication-tabs">
        <Segmented ariaLabel="SQL Authentication sections" value={tab} onChange={(v) => setTab(v as Tab)} items={TABS.map((t) => ({ ...t }))} />
      </div>
      {/* key: each tab's draft values reset on tab switch */}
      {tab === 'default' && <DefaultSqlForm key="default" title={label} />}
      {tab === 'gp' && <GroupPolicySqlForm key="gp" title={label} />}
      {tab === 'mysql' && <MySqlForm key="mysql" title={label} />}
      {tab === 'delivery' && <DeliverySettings key="delivery" title={label} />}
    </>
  );
}
