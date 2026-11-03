import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, ConfirmDialog, EmptyState, IconButton, Modal, PasswordField, SearchField, SetCard, TextField, ToneTag, useToast,
} from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { ManageComponents, useComponentWizardOpen } from '../manage-component/ManagePanel';
import { DATA_SOURCES, dsStore, newId } from './store';
import type { AdDomain, DataSourceTile } from './store';
import { Logo, MiniTable, Note } from './parts';

/* SCR-SDS-01 Add Data Source (picker) + DLG-SDS-01 Add Active Directory. */
export default function Picker() {
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [adOpen, setAdOpen] = useState(false);
  const adCount = dsStore.use((s) => s.adDomains.length);
  const fsCount = dsStore.use((s) => s.servers.length);
  const wizardOpen = useComponentWizardOpen();

  const tiles = DATA_SOURCES.filter((t) => t.label.toLowerCase().includes(q.trim().toLowerCase()));
  const count = (t: DataSourceTile) => (t.activeDirectory ? adCount : t.fileServerType === 'list' ? fsCount : 0);
  const open = (t: DataSourceTile) => {
    if (t.activeDirectory) setAdOpen(true);
    else if (t.fileServerType === 'list') nav('/settings/add-data-source/file-server');
    else if (t.fileServerType) nav('/settings/add-data-source/file-server', { state: { add: t.fileServerType } });
    else toast({ variant: 'info', title: t.label, message: `${t.label} isn't part of this prototype yet.` });
  };

  return (
    <>
      {!wizardOpen && (
        <HeaderActions>
          <div className="add-data-source-search">
            <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search data sources" maxLength={200} />
            {q && <IconButton icon="x" label="Clear search" bordered onClick={() => setQ('')} />}
          </div>
        </HeaderActions>
      )}
      {!wizardOpen && (
        <SetCard title="Data source">
          {tiles.length ? (
            <div className="pick-grid add-data-source-tiles">
              {tiles.map((t) => {
                const n = count(t);
                return (
                  <button key={t.id} type="button" className="pick add-data-source-tile" onClick={() => open(t)}>
                    <span className="pick__ic"><Logo src={t.logo} size={26} /></span>
                    <span className="pick__text"><b>{t.label}</b>{n > 0 && <ToneTag tone="good">{n} configured</ToneTag>}</span>
                  </button>
                );
              })}
            </div>
          ) : <EmptyState compact icon="search" title="No results match your search or filters." />}
        </SetCard>
      )}
      <ManageComponents />
      <AddActiveDirectory open={adOpen} onClose={() => setAdOpen(false)} />
    </>
  );
}

/* ---------------- DLG-SDS-01 ---------------- */
const BLANK = { domain: '', controller: '', user: '', password: '' };

function AddActiveDirectory({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const domains = dsStore.use((s) => s.adDomains);
  const [f, setF] = useState(BLANK);
  const [tried, setTried] = useState(false);
  const [verified, setVerified] = useState(false);
  const [remove, setRemove] = useState<AdDomain | null>(null);

  const set = (k: keyof typeof BLANK) => (v: string) => { setF((x) => ({ ...x, [k]: v })); setVerified(false); };
  const reset = () => { setF(BLANK); setTried(false); setVerified(false); };
  const close = () => { reset(); onClose(); };
  const bad = (k: keyof typeof BLANK) => tried && (!f[k].trim() || (k === 'user' && !f.user.includes('\\'))) ? true : undefined;
  const complete = () => f.domain.trim() && f.controller.trim() && f.user.trim() && f.password;

  const test = () => {
    setTried(true);
    if (!complete() || !f.user.includes('\\')) return;
    setVerified(true);
    toast({ variant: 'success', title: 'Connection successful', message: `Connected to ${f.controller.trim()} as ${f.user.trim()}.` });
  };
  const add = () => {
    setTried(true);
    if (!complete()) { toast({ variant: 'error', title: 'Required fields', message: 'Enter the domain, domain controller, user name and password.' }); return; }
    if (!f.user.includes('\\')) { toast({ variant: 'error', title: 'Check the user name', message: 'Enter user name in "Domain\\UserName" format.' }); return; }
    const d = f.domain.trim();
    if (domains.some((x) => x.domain.toLowerCase() === d.toLowerCase())) { toast({ variant: 'error', title: 'Domain exists', message: `${d} is already added.` }); return; }
    dsStore.set((s) => ({ ...s, adDomains: [...s.adDomains, { id: newId('d'), domain: d, controller: f.controller.trim(), logon: f.user.trim() }] }));
    toast({ variant: 'success', title: 'Active Directory added', message: `${d} will be audited.` });
    reset();
  };
  const req = (l: string) => <>{l} <span className="add-data-source-req" aria-hidden="true">*</span></>;

  return (
    <>
      <Modal open={open} onClose={close} title="Add Active Directory" icon="globe" size="lg"
        footer={<><Button onClick={close}>Close</Button><Button variant="primary" icon="plus" onClick={add}>Add</Button></>}>
        <div className="add-data-source-two">
          <TextField label={req('Domain Name')} required value={f.domain} placeholder="e.g. chily.local" maxLength={256} aria-invalid={bad('domain')} onChange={set('domain')} />
          <TextField label={req('Domain Controller')} required value={f.controller} placeholder="Domain controller name / IP" maxLength={256} aria-invalid={bad('controller')} onChange={set('controller')} />
          <TextField label={req('User Name')} required value={f.user} placeholder="Domain\UserName" maxLength={256} aria-invalid={bad('user')} onChange={set('user')} />
          <div className="stack stack--sm">
            <PasswordField label={req('Password')} required value={f.password} maxLength={256} aria-invalid={bad('password')} onChange={set('password')} autoComplete="new-password" />
            <button type="button" className="add-data-source-linkbtn" data-ok={verified || undefined} onClick={test}>{verified ? 'Connection verified' : 'Test connection'}</button>
          </div>
        </div>
        <Note>Enter user name in "Domain\UserName" Format.</Note>
        <h4 className="add-data-source-sub">Configured domains</h4>
        <MiniTable label="Configured domains"
          head={<><th>Domain</th><th>Domain controller Name / IP</th><th>Logon Name</th><th style={{ width: 90 }}>Actions</th></>}
          empty={domains.length === 0 ? <EmptyState compact icon="globe" title="No domains added yet." /> : undefined}>
          {domains.map((d) => (
            <tr key={d.id} className="lf-row" style={{ cursor: 'default' }}>
              <td>{d.domain}</td><td>{d.controller}</td><td>{d.logon}</td>
              <td><IconButton icon="trash" label={`Remove ${d.domain}`} danger onClick={() => setRemove(d)} /></td>
            </tr>
          ))}
        </MiniTable>
      </Modal>
      {/* GAP-SDS-34 intended: ConfirmThenMutate before removing a configured domain. */}
      <ConfirmDialog open={!!remove} onClose={() => setRemove(null)} confirmLabel="Remove" title="Remove domain"
        message={remove ? `Remove ${remove.domain}? It will no longer be audited.` : undefined}
        onConfirm={() => {
          const d = remove!; setRemove(null);
          dsStore.set((s) => ({ ...s, adDomains: s.adDomains.filter((x) => x.id !== d.id) }));
          toast({ variant: 'success', title: 'Domain removed', message: `${d.domain} is no longer audited.` });
        }} />
    </>
  );
}
