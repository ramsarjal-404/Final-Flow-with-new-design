import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Banner, Button, DataTable, EmptyState, SearchField, SetCard, ToneTag, useToast, type Column } from '../../../ui';
import { HeaderActions, HeaderDescription } from '../../SettingsFrame';
import { ExpiredLicenseDialog, LicenseActivationDialog } from './dialogs';
import { ProductGlyph } from './ProductGlyph';
import { LICENSE_PRODUCTS, LICENSE_ROWS, SALES_EMAIL, licenseStore, type LicenseRow } from './store';
import '../configure-notifications/shared/shared.css';
import './styles.css';

/* SCR-SAD-16 · License Management. State machine none → active → (Refresh) expired → (Upgrade) active. */
export default function LicenseManagementPage() {
  const toast = useToast();
  const { state, licenseId } = licenseStore.use();
  const [q, setQ] = useState('');
  const [activating, setActivating] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const expired = state === 'expired';
  const expiredRows = useMemo(() => LICENSE_ROWS.filter((r) => r.expired), []);

  const contact = () => toast({ variant: 'info', title: 'Opening your email app', message: `Write to ${SALES_EMAIL} and our team will get back to you.` });
  const refresh = () => {
    if (state === 'none') toast({ variant: 'info', title: 'No license found', message: 'Add a license to start using Lepide.' });
    else if (state === 'active') {
      licenseStore.set((s) => ({ ...s, state: 'expired' }));
      toast({ variant: 'warning', title: 'License status refreshed', message: `${expiredRows.length} licenses have expired.` });
    } else toast({ variant: 'info', title: 'License status refreshed', message: 'Upgrade your license to restore the expired platforms.' });
  };
  const activated = (id: string) => {
    licenseStore.set({ state: 'active', licenseId: id });
    setActivating(false);
    setQ('');
    toast({ variant: 'success', title: 'Congratulations!', message: 'License is activated successfully' });
  };

  const statusOf = (r: LicenseRow) => (expired && r.expired ? 'Expired' : r.licensed ? 'Licensed' : 'Not Licensed');
  const columns: Column<LicenseRow>[] = [
    { key: 'platform', header: 'Platform', sortable: true, minWidth: 160 },
    { key: 'type', header: 'License type', sortable: true },
    { key: 'acquired', header: 'License acquired', sortable: true },
    {
      key: 'available', header: 'License available', value: (r) => `${r.available} of ${r.total} available`, minWidth: 170,
      render: (r) => (
        <span className="license-management-meter">
          <span className="progress__track" role="meter" aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.available}
            aria-label={`${r.available} of ${r.total} available`}>
            <span className="progress__fill" style={{ width: `${r.total ? (r.available / r.total) * 100 : 0}%` }} />
          </span>
          <b>{r.available}</b>
        </span>
      ),
    },
    { key: 'validUntil', header: 'Valid until', sortable: true },
    { key: 'supportUntil', header: 'Support until', sortable: true },
    {
      key: 'status', header: 'Status', value: statusOf,
      render: (r) => { const s = statusOf(r); return <ToneTag tone={s === 'Expired' ? 'bad' : s === 'Licensed' ? 'good' : 'none'}>{s}</ToneTag>; },
    },
  ];

  const term = q.trim().toLowerCase();
  const match = (r: LicenseRow) => !term || [r.platform, r.type, r.acquired].some((x) => x.toLowerCase().includes(term));
  const groups = LICENSE_PRODUCTS.map((p) => ({ product: p, rows: LICENSE_ROWS.filter((r) => r.product === p && match(r)) })).filter((g) => g.rows.length > 0);

  const total = LICENSE_ROWS.reduce((a, r) => a + r.total, 0);
  const licensedCount = LICENSE_ROWS.filter((r) => r.licensed).length;
  const expiredCount = expired ? expiredRows.length : 0;
  const activeCount = licensedCount - expiredCount;
  const notLicensed = LICENSE_ROWS.length - licensedCount;

  return (
    <>
      <HeaderDescription>
        <p>This software is licensed to : {state === 'none' ? 'UNREGISTERED (UNREGISTERED )' : `Lepide Software (${licenseId})`}</p>
      </HeaderDescription>
      <HeaderActions>
        <Button icon="mail" onClick={contact}>{expired ? 'Contact Us' : 'Contact us'}</Button>
        <Button icon="refresh" onClick={refresh}>Refresh</Button>
        <Button variant="primary" icon="key" onClick={() => setActivating(true)}>{expired ? 'Upgrade License' : 'Add License'}</Button>
      </HeaderActions>

      <SetCard title="License overview"
        actions={state !== 'none' ? <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search platforms" style={{ width: 240 }} /> : undefined}>
        {state === 'none' ? (
          <EmptyState icon="key" title="We couldn’t find a license for this account." message="Add a license now or get in touch and we’ll sort it out." />
        ) : (
          <>
            {expired && (
              <Banner tone="error" action={<Button size="sm" onClick={() => setShowExpired(true)}>View expired license details</Button>}>
                Your license has expired. Please upgrade your license to continue using all features without interruption
              </Banner>
            )}
            <div className="license-management-stats" role="list" aria-label="License summary">
              <Stat label="Total licenses" value={total.toLocaleString('en-US')} />
              <Stat label="Total products" value={String(LICENSE_PRODUCTS.length)}
                foot={<span className="license-management-tiles">{LICENSE_PRODUCTS.map((p) => <ProductGlyph key={p} product={p} size={16} tile />)}</span>} />
              <Stat label="Total platform" value={String(LICENSE_ROWS.length)} />
              <Stat label="Activated" value={String(activeCount)} tone="good" />
              <Stat label="Expired" tone={expiredCount ? 'bad' : undefined}
                value={expiredCount ? (
                  <button type="button" className="license-management-statlink" onClick={() => setShowExpired(true)}
                    aria-label={`${expiredCount} expired licenses — view details`}>{expiredCount}</button>
                ) : '0'} />
              <Stat label="Not licensed" value={String(notLicensed)} />
            </div>
            {groups.length === 0 ? (
              <EmptyState icon="search" title="No results match your search or filters." compact />
            ) : groups.map((g) => (
              <DataTable key={g.product} flat columns={columns} rows={g.rows} rowKey={(r) => r.id} noun={['platform', 'platforms']}
                title={<span className="license-management-product"><ProductGlyph product={g.product} tile />{g.product}</span>} />
            ))}
          </>
        )}
      </SetCard>

      <LicenseActivationDialog open={activating} onClose={() => setActivating(false)} onActivated={activated} />
      <ExpiredLicenseDialog open={showExpired} onClose={() => setShowExpired(false)} rows={expiredRows} />
    </>
  );
}

function Stat({ label, value, foot, tone }: { label: string; value: ReactNode; foot?: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className={'license-management-stat' + (tone ? ' license-management-stat--' + tone : '')} role="listitem">
      <span className="license-management-stat__label">{label}</span>
      <span className="license-management-stat__value">{value}</span>
      {foot}
    </div>
  );
}
