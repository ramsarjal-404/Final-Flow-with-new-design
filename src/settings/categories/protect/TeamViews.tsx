import { useMemo, useState } from 'react';
import {
  Button, Chip, ConfirmDialog, DataTable, EmptyState, Field, FileUpload, Icon, IconButton, Menu, SetCard, TextField, useToast,
  type Column,
} from '../../../ui';
import {
  CSV_GUIDELINES, CSV_TEMPLATE, HRMS_PROVIDERS, downloadText, parseMembers, protectStore, scheduleText, setSource, toCsv,
  type CsvMember, type HrmsProvider,
} from './store';
import type { WizardTarget } from './SourceWizard';

/* SCR-SDS-21 sub-views HRMS · Active Directory · CSV, with DLG-SDS-69 and DLG-SDS-74. */

function ProviderTile({ p, active, disabled, onClick }: { p: HrmsProvider; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="pick" aria-pressed={active} disabled={disabled} onClick={onClick}
      aria-label={active ? `${p.label} (configured)` : p.label}>
      <span className="pick__ic"><img src={p.logo} alt="" /></span>
      <span className="pick__text"><b>{p.label}</b><span>{active ? 'Configured · open to edit' : 'Human Resource Management System'}</span></span>
      {active && <span className="pick__check" aria-hidden="true"><Icon name="check" /></span>}
    </button>
  );
}

export function HrmsView({ onOpen }: { onOpen: (t: WizardTarget) => void }) {
  const toast = useToast();
  const source = protectStore.use((s) => s.source);
  const [detach, setDetach] = useState(false);
  const hrms = source?.kind === 'hrms' ? source : null;
  const activeP = hrms ? HRMS_PROVIDERS.find((p) => p.id === hrms.provider)! : null;
  const openEdit = () => hrms && onOpen({ kind: 'hrms', provider: hrms.provider, edit: true, existing: hrms.result });

  return (
    <>
      <SetCard title="HRMS" description="Please choose a Human Resource Management System (HRMS) for Team Setup.">
        <div className="pick-grid">
          {HRMS_PROVIDERS.map((p) => (
            <ProviderTile key={p.id} p={p} active={hrms?.provider === p.id}
              disabled={(!!source && source.kind !== 'hrms') || (!!hrms && hrms.provider !== p.id)}
              onClick={() => (hrms?.provider === p.id ? openEdit() : onOpen({ kind: 'hrms', provider: p.id, edit: false }))} />
          ))}
          <div className="protect-provider">
            <Button onClick={() => toast({ variant: 'info', title: 'Contact Lepide', message: 'Our team will reach out about integrating your custom HRMS.' })}>Contact Us!</Button>
            <span>For Custom HRMS contact us!</span>
          </div>
        </div>
        <p className="protect-note"><b>Please Note:</b> Member integration can be performed using HRMS, Active Directory, or a CSV file, but only one source can be used at a time.</p>
      </SetCard>

      {hrms && activeP && (
        <SetCard title="Added Source">
          <div className="protect-added">
            <span className="pick__ic"><img src={activeP.logo} alt="" /></span>
            <div className="grow"><b>{activeP.label}</b><span>Sync: {scheduleText(hrms.result.schedule)}</span></div>
            <Menu label={`Actions for ${activeP.label}`} items={[
              { label: 'Edit', icon: 'edit', onSelect: openEdit },
              { label: 'Detach', icon: 'trash', danger: true, onSelect: () => setDetach(true) },
            ]} trigger={(p) => <IconButton icon="more" label={`Actions for ${activeP.label}`} bordered {...p} />} />
          </div>
        </SetCard>
      )}

      <ConfirmDialog open={detach} onClose={() => setDetach(false)} title="Detach from HRMS?"
        message="If you detach from HRMS, you will lose all your integrated details. Are you sure you want to proceed?" confirmLabel="I understand"
        onConfirm={() => { setSource(null); setDetach(false); toast({ variant: 'success', title: 'HRMS detached', message: 'Choose HRMS, Active Directory or CSV to set up team members again.' }); }} />
    </>
  );
}

export function AdView({ onOpen }: { onOpen: (t: WizardTarget) => void }) {
  const toast = useToast();
  const source = protectStore.use((s) => s.source);
  const [remove, setRemove] = useState(false);
  const ad = source?.kind === 'ad' ? source : null;

  if (!ad) {
    return (
      <section className="lf-card tablecard" style={{ minHeight: 360 }}>
        <EmptyState icon="users" title="You have not added any Active Directory. Please integrate an Active Directory entry to advance with the process."
          action={<Button variant="primary" icon="plus" disabled={!!source} onClick={() => onOpen({ kind: 'ad', edit: false })}>Add Active Directory</Button>} />
      </section>
    );
  }
  const domain = ad.result.domain;
  return (
    <>
      <SetCard title="Active Directory">
        <div className="page-form form-col">
          <Field label="Added Domain">
            <div className="row">
              <input className="grow" value={domain} readOnly aria-label="Added Domain" />
              <IconButton icon="trash" danger bordered label={`Remove ${domain}`} onClick={() => setRemove(true)} />
              <IconButton icon="edit" bordered label={`Edit ${domain}`} onClick={() => onOpen({ kind: 'ad', edit: true, existing: ad.result })} />
            </div>
          </Field>
          <p className="protect-note">Sync: {scheduleText(ad.result.schedule)}</p>
        </div>
      </SetCard>
      <ConfirmDialog open={remove} onClose={() => setRemove(false)} title="Remove Active Directory?"
        message={`Remove ${domain}? Team members synced from it are cleared.`} confirmLabel="Remove"
        onConfirm={() => { setSource(null); setRemove(false); toast({ variant: 'success', title: 'Active Directory removed', message: '' }); }} />
    </>
  );
}

const memberCsv = (ms: CsvMember[]) => toCsv(['User Name', 'Email', 'Manager'], ms.map((m) => [m.user, m.email, m.manager]));

export function CsvView() {
  const toast = useToast();
  const source = protectStore.use((s) => s.source);
  const [domain, setDomain] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [domainErr, setDomainErr] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const csv = source?.kind === 'csv' ? source : null;

  const managers = useMemo(() => new Set((csv?.members ?? []).map((m) => m.manager.trim().toLowerCase()).filter(Boolean)), [csv]);
  const columns: Column<CsvMember>[] = [
    { key: 'user', header: 'User Name', filterable: true, sortable: true, value: (m) => m.user,
      render: (m) => managers.has(m.user.toLowerCase())
        ? <span className="row"><b>{m.user}</b><Chip tone="brand" icon="users">Manager</Chip></span> : m.user },
    { key: 'email', header: 'Email', filterable: true, sortable: true },
    { key: 'manager', header: 'Manager', filterable: true, sortable: true },
  ];

  const pick = (f: File) => {
    if (!/\.csv$/i.test(f.name)) { setFile(null); setFileErr('Only .csv files can be uploaded.'); return; }
    setFile(f); setFileErr(null);
  };
  const upload = async () => {
    let bad = false;
    if (!domain.trim()) { setDomainErr('Enter the domain name the CSV users belong to.'); bad = true; } else setDomainErr(null);
    if (!file) { setFileErr('Select a CSV file to upload.'); return; }
    if (bad) return;
    const members = parseMembers(await file.text());
    if (!members.length) { setFileErr('No users found. Use the template columns: User Name, Email, Manager.'); return; }
    setFileErr(null);
    setSource({ kind: 'csv', domain: domain.trim(), fileName: file.name, members });
    toast({ variant: 'success', title: 'CSV uploaded', message: `${members.length} member(s) imported for ${domain.trim()}.` });
    setDomain(''); setFile(null);
  };

  if (csv) {
    return (
      <>
        <SetCard title="Added CSV Source">
          <div className="protect-added">
            <span className="basecard__ic"><Icon name="file" /></span>
            <div className="grow"><b>{csv.fileName}</b><span>{csv.domain} · {csv.members.length} member(s)</span></div>
            <IconButton icon="download" bordered label={`Download ${csv.fileName}`} onClick={() => downloadText(csv.fileName, memberCsv(csv.members))} />
            <IconButton icon="trash" bordered danger label={`Remove ${csv.fileName}`} onClick={() => setRemove(true)} />
          </div>
        </SetCard>
        <DataTable title="CSV" noun={['member', 'members']} columns={columns} rows={csv.members} rowKey={(m) => m.id} />
        <ConfirmDialog open={remove} onClose={() => setRemove(false)} title="Remove CSV source?"
          message={`Remove ${csv.fileName}? Its ${csv.members.length} member(s) are cleared.`} confirmLabel="Remove"
          onConfirm={() => { setSource(null); setRemove(false); toast({ variant: 'success', title: 'CSV source removed', message: '' }); }} />
      </>
    );
  }

  return (
    <SetCard title="CSV" description="Upload the team members of one domain from a CSV file."
      footer={<>
        <Button variant="ghost" icon="download" onClick={() => downloadText('lepide-protect-members-template.csv', CSV_TEMPLATE)}>Download CSV Template</Button>
        <Button variant="primary" icon="upload" disabled={!!source} onClick={upload}>Upload</Button>
      </>}>
      <div className="page-form form-col">
        <TextField label="Domain Name" placeholder="chily.com" value={domain} error={domainErr} maxLength={255}
          onChange={(v) => { setDomain(v); if (domainErr) setDomainErr(null); }} />
        <Field error={fileErr}>
          <FileUpload accept=".csv" onFile={pick} label={file ? file.name : 'No File Yet'} rules="Drag & Drop or Select a file to upload" />
        </Field>
        <div className="stack stack--sm">
          <p className="protect-lead"><b>Please follow these guidelines before uploading your CSV:</b></p>
          <ul className="protect-lead" style={{ margin: 0, paddingLeft: 20 }}>{CSV_GUIDELINES.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
      </div>
    </SetCard>
  );
}
