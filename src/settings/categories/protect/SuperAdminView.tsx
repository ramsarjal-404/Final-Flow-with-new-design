import { useState } from 'react';
import { Button, DataTable, Icon, SetCard, useToast, type Column } from '../../../ui';
import { CURRENT_ADMIN, SUPER_ADMINS, protectStore, type SuperAdmin } from './store';

/* SCR-SDS-21 sub-view Super Admin Privileges (FLW-SDS-25). */
export function SuperAdminView() {
  const toast = useToast();
  const assigned = protectStore.use((s) => s.superAdmin);
  const [picked, setPicked] = useState<string | null>(null);

  if (assigned) {
    return (
      <SetCard title="Super Admin Privileges"
        footer={<Button variant="primary" onClick={() => {
          protectStore.set((s) => ({ ...s, superAdmin: null })); setPicked(null);
          toast({ variant: 'success', title: 'Super Admin unassigned', message: `${assigned.name} no longer holds Super Admin privileges.` });
        }}>Unassign</Button>}>
        <div className="protect-added">
          <span className="basecard__ic"><Icon name="shield" /></span>
          <p className="grow protect-lead" style={{ color: 'var(--ink)' }}>
            <b>{assigned.name}{assigned.name === CURRENT_ADMIN ? ' (you)' : ''}</b> for domain <b>{assigned.domain}</b> is now responsible for configuring Lepide Protect as a Super Admin.
          </p>
        </div>
      </SetCard>
    );
  }

  const columns: Column<SuperAdmin>[] = [
    { key: 'name', header: 'Super admin', filterable: true, sortable: true, value: (a) => a.name,
      render: (a) => (
        <label className="row" style={{ cursor: 'pointer' }}>
          <input type="radio" name="protect-super-admin" checked={picked === a.id} onChange={() => setPicked(a.id)}
            style={{ accentColor: 'var(--brand)', width: 15, height: 15, margin: 0 }} aria-label={`${a.name} (${a.domain})`} />
          <span>{a.name}</span>
        </label>
      ) },
    { key: 'domain', header: 'Domain Name', filterable: true, sortable: true },
  ];
  const apply = () => {
    const a = SUPER_ADMINS.find((x) => x.id === picked); if (!a) return;
    protectStore.set((s) => ({ ...s, superAdmin: { name: a.name, domain: a.domain } }));
    toast({ variant: 'success', title: 'Super Admin assigned', message: `${a.name} now configures Lepide Protect for ${a.domain}.` });
  };

  return (
    <SetCard title="Please configure super admin privileges"
      footer={<>
        <span className="lf-muted" style={{ whiteSpace: 'normal' }}>Important: To access Lepide Protect, please ensure that the user is granted the necessary Super Admin Privileges specific to their domain. As our Lepide Protect is designed to support a single domain, users without this domain-specific privilege will not be able to manage or access the permission settings.</span>
        <Button variant="primary" disabled={!picked} onClick={apply}>Apply</Button>
      </>}>
      <DataTable flat columns={columns} rows={SUPER_ADMINS} rowKey={(a) => a.id} noun={['admin', 'admins']} activeKey={picked} />
    </SetCard>
  );
}
