import { useState } from 'react';
import {
  Button, Checkbox, ConfirmDialog, DataTable, EmptyState, IconButton, Modal, PasswordField, RadioGroup, SelectField, SetCard, TextField, useToast,
} from '../../../ui';
import type { Column } from '../../../ui';
import { backupStamp, dsStore, newId } from './store';
import type { Backup } from './store';
import { ActionPane, ConsoleChrome, useInvalid } from './parts';

/* SCR-SDS-07 General Settings (file server) + DLG-SDS-28/29/30. */

type Section = 'port' | 'service' | 'notify' | 'backup';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GeneralSettings() {
  const toast = useToast();
  const general = dsStore.use((s) => s.general);
  const backups = dsStore.use((s) => s.backups);
  const [section, setSection] = useState<Section>('port');
  const [create, setCreate] = useState(false);
  const [restore, setRestore] = useState(false);
  const [del, setDel] = useState<Backup | null>(null);

  // section drafts reload from the saved state whenever the section changes
  const [port, setPort] = useState(general.port);
  const [svc, setSvc] = useState({ account: general.serviceAccount, user: general.serviceUser, password: '' });
  const [notify, setNotify] = useState({ on: general.notify, email: general.notifyEmail });
  const v = useInvalid();
  const switchTo = (s: Section) => {
    const g = dsStore.get().general;
    setPort(g.port); setSvc({ account: g.serviceAccount, user: g.serviceUser, password: '' }); setNotify({ on: g.notify, email: g.notifyEmail });
    v.mark([]); setSection(s);
  };
  const portBad = !/^\d+$/.test(port.trim()) || Number(port) < 1 || Number(port) > 65535;
  const emailBad = notify.on && !EMAIL.test(notify.email.trim());
  const isBackup = section === 'backup';

  const backupCols: Column<Backup>[] = [
    { key: 'name', header: 'Backup Name', minWidth: 160 },
    { key: 'path', header: 'Backup Path', minWidth: 200 },
    { key: 'created', header: 'Backup Creation Time', minWidth: 190 },
    { key: 'actions', header: 'Actions', width: 90, render: (b) => <IconButton icon="trash" danger label={`Delete ${b.name}`} onClick={() => setDel(b)} /> },
  ];

  return (
    <ConsoleChrome current="general" icon="sliders" crumbs={[{ label: 'General Settings' }]}
      title={isBackup ? 'General Settings - Backup & Restore' : 'General Settings'}
      subtitle={isBackup ? 'Details of earlier backup. Use options to create new backup or restore settings from existing backup.' : undefined}
      actions={isBackup ? <>
        <Button icon="restore" disabled={!backups.length} onClick={() => setRestore(true)}>Restore backup</Button>
        <Button variant="primary" icon="plus" onClick={() => setCreate(true)}>Create backup</Button>
      </> : undefined}>
      <div className="add-data-source-body">
        <ActionPane current={section} onPick={(id) => switchTo(id as Section)}
          items={[
            { id: 'port', label: 'Port Settings', icon: 'plug' },
            { id: 'service', label: 'Service Rights', icon: 'key' },
            { id: 'notify', label: `Audit Notifications: ${general.notify ? 'on' : 'off'}`, icon: 'bell' },
            { id: 'backup', label: 'Backup & Restore', icon: 'archive' },
          ]} />
        <div className="stack">
          {section === 'port' && (
            <SetCard title="Port Settings"
              footer={<>
                <Button onClick={() => { setPort(general.port); v.mark([]); }}>Cancel</Button>
                <Button variant="primary" onClick={() => {
                  if (portBad) { v.mark(['port']); toast({ variant: 'error', title: 'Port Number', message: 'Enter a port between 1 and 65535.' }); return; }
                  const n = String(Number(port.trim()));
                  dsStore.set((s) => ({ ...s, general: { ...s.general, port: n } })); setPort(n);
                  toast({ variant: 'success', title: 'Port saved', message: `The file server service listens on port ${n}.` });
                }}>Done</Button>
              </>}>
              <div className="page-form form-col">
                <TextField label="Port Number" value={port} inputMode="numeric" maxLength={5} aria-invalid={portBad || undefined} onChange={setPort} />
              </div>
            </SetCard>
          )}
          {section === 'service' && (
            <SetCard title="Service Rights" description="It is recommended to use the admin user's credentials"
              footer={<>
                <Button onClick={() => { setSvc({ account: general.serviceAccount, user: general.serviceUser, password: '' }); v.mark([]); }}>Cancel</Button>
                <Button variant="primary" icon="play" onClick={() => {
                  if (svc.account === 'user' && (!svc.user.trim() || !svc.password)) {
                    v.mark([!svc.user.trim() && 'user', !svc.password && 'password'].filter(Boolean) as string[]);
                    toast({ variant: 'error', title: 'Service Rights', message: 'Enter the user name and password.' }); return;
                  }
                  dsStore.set((s) => ({ ...s, general: { ...s.general, serviceAccount: svc.account, serviceUser: svc.account === 'user' ? svc.user.trim() : s.general.serviceUser } }));
                  toast({ variant: 'success', title: 'Service rights applied', message: svc.account === 'user' ? `The service now runs as ${svc.user.trim()}.` : 'The service runs as the service user account.' });
                }}>Run</Button>
              </>}>
              <div className="page-form form-col">
                <RadioGroup ariaLabel="Service account" value={svc.account} onChange={(x) => { setSvc((s) => ({ ...s, account: x as 'service' | 'user' })); v.mark([]); }}
                  options={[{ value: 'service', label: 'Service User Account' }, { value: 'user', label: 'This User' }]} />
                <div className="add-data-source-two">
                  <TextField label="User Name" value={svc.user} disabled={svc.account !== 'user'} maxLength={256} aria-invalid={v.inv('user')}
                    onChange={(x) => { setSvc((s) => ({ ...s, user: x })); v.clear('user'); }} />
                  {/* GAP-SDS-29: no fake masked value; the field is empty with a masked placeholder. */}
                  <PasswordField label="Password" value={svc.password} disabled={svc.account !== 'user'} maxLength={256} placeholder="••••••••" aria-invalid={v.inv('password')}
                    onChange={(x) => { setSvc((s) => ({ ...s, password: x })); v.clear('password'); }} autoComplete="new-password" />
                </div>
                <p className="add-data-source-note">Note : Enter the user name in "Domain/User Name" format for domain users and "Computer Name\User Name or .\User Name" for local users.</p>
              </div>
            </SetCard>
          )}
          {section === 'notify' && (
            <SetCard title="Audit Notifications"
              footer={<>
                <Button onClick={() => { setNotify({ on: general.notify, email: general.notifyEmail }); v.mark([]); }}>Cancel</Button>
                <Button variant="primary" onClick={() => {
                  if (emailBad) { v.mark(['email']); toast({ variant: 'error', title: 'Email Address', message: 'Enter a valid email address.' }); return; }
                  dsStore.set((s) => ({ ...s, general: { ...s.general, notify: notify.on, notifyEmail: notify.email.trim() } }));
                  toast(notify.on
                    ? { variant: 'success', title: 'Audit notifications on', message: `Status notifications go to ${notify.email.trim()}.` }
                    : { variant: 'success', title: 'Audit notifications off', message: 'No audit status emails will be sent.' });
                }}>Done</Button>
              </>}>
              <div className="page-form form-col">
                <Checkbox label="Send Audit Status Notifications to" checked={notify.on} onChange={(x) => setNotify((n) => ({ ...n, on: x }))} />
                <div className="add-data-source-inline">
                  <TextField label="Email Address" type="email" value={notify.email} disabled={!notify.on} maxLength={256} aria-invalid={emailBad || undefined}
                    onChange={(x) => setNotify((n) => ({ ...n, email: x }))} />
                  <Button icon="mail" onClick={() => toast({ variant: 'info', title: 'Server settings', message: 'SMTP server settings live in Configure Notifications.' })}>Server settings</Button>
                </div>
              </div>
            </SetCard>
          )}
          {isBackup && (
            <>
              <DataTable columns={backupCols} rows={backups} rowKey={(b) => b.id} noun={['backup', 'backups']}
                empty={<EmptyState compact icon="archive" title="No backups yet. Click Create Backup to save the current settings." />} />
              <p className="add-data-source-foot-note">Backups are created to save existing settings. In future if you need to apply old settings then they can be restored.</p>
            </>
          )}
        </div>
      </div>

      {create && <CreateBackup onClose={() => setCreate(false)} />}
      {restore && <RestoreBackup onClose={() => setRestore(false)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} confirmLabel="Delete" title="Delete backup"
        message={del ? `Delete backup "${del.name}"? This can't be undone.` : undefined}
        onConfirm={() => {
          const b = del!; setDel(null);
          dsStore.set((s) => ({ ...s, backups: s.backups.filter((x) => x.id !== b.id) }));
          toast({ variant: 'success', title: 'Backup deleted', message: b.name });
        }} />
    </ConsoleChrome>
  );
}

/* ---------------- DLG-SDS-28 ---------------- */
function CreateBackup({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const backups = dsStore.use((s) => s.backups);
  const [name, setName] = useState('');
  const [path, setPath] = useState('C:\\Users DEVL\\150\\Desktop');
  const v = useInvalid();
  const create = () => {
    const n = name.trim(), p = path.trim();
    if (!n || !p) { v.mark([!n && 'name', !p && 'path'].filter(Boolean) as string[]); toast({ variant: 'error', title: 'Required fields', message: 'Enter the backup name and path.' }); return; }
    if (backups.some((b) => b.name.toLowerCase() === n.toLowerCase())) { v.mark(['name']); toast({ variant: 'error', title: 'Name in use', message: `A backup named ${n} already exists.` }); return; }
    dsStore.set((s) => ({ ...s, backups: [...s.backups, { id: newId('b'), name: n, path: p, created: backupStamp() }] }));
    toast({ variant: 'success', title: 'Backup created', message: `${n} saved to ${p}.` });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Create backup" icon="archive" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={create}>Create</Button></>}>
      <TextField label="Backup Name" value={name} maxLength={128} aria-invalid={v.inv('name')} onChange={(x) => { setName(x); v.clear('name'); }} />
      <TextField label="Backup Path" value={path} maxLength={260} aria-invalid={v.inv('path')} onChange={(x) => { setPath(x); v.clear('path'); }} />
    </Modal>
  );
}

/* ---------------- DLG-SDS-29 ---------------- */
function RestoreBackup({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const backups = dsStore.use((s) => s.backups);
  const [id, setId] = useState(backups[0]?.id ?? '');
  const b = backups.find((x) => x.id === id);
  return (
    <Modal open onClose={onClose} title="Restore backup" icon="restore" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!b} onClick={() => {
        toast({ variant: 'success', title: 'Settings restored', message: `File server settings restored from ${b!.name}.` });
        onClose();
      }}>Restore</Button></>}>
      <SelectField label="Backup" value={id} options={backups.map((x) => ({ value: x.id, label: `${x.name} (${x.created})` }))} onChange={setId} />
      <p className="add-data-source-note">Restoring replaces the current file server settings with the ones saved in this backup.</p>
    </Modal>
  );
}
