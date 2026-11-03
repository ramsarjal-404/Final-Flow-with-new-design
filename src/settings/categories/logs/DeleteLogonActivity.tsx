import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, EmptyState, IconButton, SelectField, useToast } from '../../../ui';
import { LOG_DOMAINS, LOG_TENANTS, adminActions, adminStore, type RetentionSchedule, type RetentionTarget } from '../../../stores/admin';
import { AdminTable, DigitsField, useTable, type Col } from '../general/kit';

/* DLG-SAD-08 · Delete Logon Activity. GAP-SAD-22 resolved as a route: it renders as a sub-page of
   Logs at /settings/logs/delete-logon-activity (deep-linkable), keeping its "Back to Logs" action
   and the "Logs / Delete Logon Activity" breadcrumb. */

export function DeleteLogonActivity({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const all = adminStore.use((s) => s.schedules);
  const [target, setTarget] = useState<RetentionTarget>('domain');
  const [name, setName] = useState('');
  const [days, setDays] = useState('0');
  const [errors, setErrors] = useState<{ name?: string; days?: string }>({});

  const label = target === 'tenant' ? 'Tenant Name' : 'Domain Name';
  const rows = useMemo(() => all.filter((s) => s.target === target), [all, target]);
  const cols = useMemo<Col<RetentionSchedule>[]>(() => [
    { key: 'name', header: label, tip: true, minWidth: 220 },
    { key: 'status', header: 'Status', minWidth: 260,
      text: (s) => (s.target === 'tenant' ? `This Tenant will be deleted in ${s.days} Days` : `This Log Domain will be deleted in ${s.days} Days`) },
  ], [label]);
  const model = useTable(rows, cols);

  const switchTo = (t: RetentionTarget) => { setTarget(t); setName(''); setDays('0'); setErrors({}); };

  const apply = () => {
    const e: { name?: string; days?: string } = {};
    if (!name) e.name = target === 'tenant' ? 'Please select a tenant.' : 'Please select a domain.';
    const n = Number(days);
    if (!/^\d+$/.test(days) || n < 1 || n > 3650) e.days = 'Enter days between 1 and 3650.';
    setErrors(e);
    if (e.name || e.days) return;
    const r = adminActions.scheduleRetention(target, name, n);
    toast({ variant: 'success', title: r === 'updated' ? 'Deletion rescheduled' : 'Deletion scheduled', message: `Logon activity of ${name} will be deleted in ${n} days.` });
  };

  const cancel = (s: RetentionSchedule) => {
    adminActions.removeSchedule(s.id);
    toast({ variant: 'success', title: 'Deletion cancelled', message: `Logon activity of ${s.name} will be kept.` });
  };

  return (
    <section className="lf-card logs-dla" aria-label="Delete Logon Activity">
      <header className="logs-dla__top">
        <IconButton icon="chevron-left" label="Back to Logs" bordered onClick={onBack} />
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/settings/logs">Logs</Link><span aria-hidden="true">&rsaquo;</span><b aria-current="page">Delete Logon Activity</b>
        </nav>
      </header>
      <div className="logs-dla__grid">
        <nav className="logs-dla__src" aria-label="Logon activity source">
          <button type="button" aria-pressed={target === 'tenant'} onClick={() => switchTo('tenant')}>Tenant Name</button>
          <button type="button" aria-pressed={target === 'domain'} onClick={() => switchTo('domain')}>Domain Name</button>
        </nav>
        <div className="logs-dla__main">
          <h3>Delete Logon Activity</h3>
          <form className="logs-dla__form page-form" noValidate onSubmit={(e) => { e.preventDefault(); apply(); }}>
            <SelectField key={target} label={label} placeholder="Select" value={name} error={errors.name}
              options={target === 'tenant' ? LOG_TENANTS : LOG_DOMAINS}
              onChange={(v) => { setName(v); setErrors((x) => ({ ...x, name: undefined })); }} />
            <DigitsField label="Days" value={days} maxLength={4} min={1} max={3650} error={errors.days}
              onChange={(v) => { setDays(v); setErrors((x) => ({ ...x, days: undefined })); }} />
            <Button type="submit" variant="primary">Apply</Button>
          </form>
          <AdminTable model={model} cols={cols} rowKey={(s) => s.id} flat label="Scheduled deletions"
            empty={<EmptyState compact icon="clock" title="No records yet." />}
            rowActions={(s) => (
              <IconButton icon="trash" danger label={`Cancel deletion for ${s.name}`} data-tip="Cancel scheduled deletion" onClick={() => cancel(s)} />
            )} />
        </div>
      </div>
    </section>
  );
}
