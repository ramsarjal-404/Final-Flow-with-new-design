import { useState } from 'react';
import {
  Button, Checkbox, ConfirmDialog, DataTable, EmptyState, IconButton, Menu, Modal, NumberField, PageHeader, Person,
  SearchField, SelectField, SetCard, SettingRow, TextField, ToneTag, useToast, type Column, type StatusTone,
  fmtDateTime,
} from '@lepide/ds-react';
import { KpiCard } from '@lepide/ds-react/charts';

/* Golden example — Users (Settings › Users).
   Pattern: admin list — KPI row, user table with row actions, an invite dialog with inline validation,
   and a settings card whose changes apply on Save. */

type Status = 'Active' | 'Invited' | 'Locked' | 'Disabled';
type User = { id: string; name: string; email: string; role: string; status: Status; lastSignIn: string }; // lastSignIn: 'YYYY-MM-DD HH:MM', sorts as text
type Defaults = { role: string; expiry: number | ''; mfa: boolean };

const ROLES = ['Administrator', 'Security analyst', 'Auditor', 'Read-only'];
const STATUS_TONE: Record<Status, StatusTone> = { Active: 'good', Invited: 'warn', Locked: 'bad', Disabled: 'none' };

const USERS: User[] = [
  { id: 'u01', name: 'Ann Lee', email: 'ann.lee@corp.com', role: 'Administrator', status: 'Active', lastSignIn: '2026-11-03 09:12' },
  { id: 'u02', name: 'Raj Patel', email: 'raj.patel@corp.com', role: 'Administrator', status: 'Active', lastSignIn: '2026-11-03 08:47' },
  { id: 'u03', name: 'Amara Okafor', email: 'amara.okafor@corp.com', role: 'Security analyst', status: 'Active', lastSignIn: '2026-11-03 08:05' },
  { id: 'u04', name: 'Yuki Tanaka', email: 'yuki.tanaka@corp.com', role: 'Security analyst', status: 'Active', lastSignIn: '2026-11-02 17:30' },
  { id: 'u05', name: 'Maria Gomez', email: 'maria.gomez@corp.com', role: 'Auditor', status: 'Invited', lastSignIn: '' },
  { id: 'u06', name: 'Tom Becker', email: 'tom.becker@corp.com', role: 'Read-only', status: 'Disabled', lastSignIn: '2026-10-12 14:20' },
  { id: 'u07', name: 'Omar Haddad', email: 'omar.haddad@corp.com', role: 'Read-only', status: 'Invited', lastSignIn: '' },
  { id: 'u08', name: 'Lena Martin', email: 'lena.martin@corp.com', role: 'Auditor', status: 'Active', lastSignIn: '2026-11-01 11:02' },
  { id: 'u09', name: 'Kofi Mensah', email: 'kofi.mensah@corp.com', role: 'Security analyst', status: 'Locked', lastSignIn: '2026-10-30 16:44' },
  { id: 'u10', name: 'Hannah Schmidt', email: 'hannah.schmidt@corp.com', role: 'Read-only', status: 'Active', lastSignIn: '2026-10-29 10:15' },
  { id: 'u11', name: 'Priya Nair', email: 'priya.nair@corp.com', role: 'Auditor', status: 'Active', lastSignIn: '2026-10-28 09:31' },
  { id: 'u12', name: 'Daniel Brooks', email: 'daniel.brooks@corp.com', role: 'Administrator', status: 'Active', lastSignIn: '2026-10-27 13:58' },
];


const columns: Column<User>[] = [
  { key: 'name', header: 'Name', sortable: true, minWidth: 220, render: (u) => <Person name={u.name} /> },
  { key: 'email', header: 'Email', sortable: true, minWidth: 230 },
  { key: 'role', header: 'Role', sortable: true, width: 160 },
  { key: 'status', header: 'Status', sortable: true, width: 120, render: (u) => <ToneTag tone={STATUS_TONE[u.status]}>{u.status}</ToneTag> },
  { key: 'lastSignIn', header: 'Last sign-in', sortable: true, width: 170,
    render: (u) => (u.lastSignIn ? fmtDateTime(u.lastSignIn) : <span className="lf-na">—</span>),
    title: (u) => (u.lastSignIn ? fmtDateTime(u.lastSignIn) : 'Never signed in') },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState(USERS);
  const [q, setQ] = useState('');

  // Invitation defaults: `saved` is what invitations use; `draft` is the form until Save.
  const [saved, setSaved] = useState<Defaults>({ role: 'Read-only', expiry: 7, mfa: true });
  const [draft, setDraft] = useState<Defaults>(saved);
  const dirty = draft.role !== saved.role || draft.expiry !== saved.expiry || draft.mfa !== saved.mfa;
  const expiryError = draft.expiry === '' || draft.expiry < 1 || draft.expiry > 30 ? 'Enter a number of days from 1 to 30.' : null;

  // Invite dialog
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(saved.role);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [disabling, setDisabling] = useState<User | null>(null);

  const update = (id: string, patch: Partial<User>) => setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));

  const openInvite = () => { setEmail(''); setRole(saved.role); setEmailError(null); setInviting(true); };
  const sendInvite = () => {
    const e = email.trim().toLowerCase();
    const err = !e ? 'Enter an email address.'
      : !EMAIL.test(e) ? 'Enter a valid email address, like name@corp.com.'
      : users.some((u) => u.email === e) ? `${e} already has a Lepide account.` : null;
    setEmailError(err);
    if (err) return;
    setUsers((list) => [{ id: `u${Date.now()}`, name: e, email: e, role, status: 'Invited', lastSignIn: '' }, ...list]);
    setInviting(false);
    toast({ variant: 'success', title: 'Invitation sent', message: `${e} can sign in as ${role} for the next ${saved.expiry} days.` });
  };

  const saveDefaults = () => {
    if (expiryError) return;
    setSaved(draft);
    toast({ variant: 'success', title: 'Invitation defaults saved', message: 'New invitations use these settings.' });
  };

  const admins = users.filter((u) => u.role === 'Administrator' && u.status !== 'Disabled').length;
  const pending = users.filter((u) => u.status === 'Invited').length;

  return (
    <div className="sub">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Settings', to: '/settings' }, { label: 'Users' }]}
        title="Users"
        description="Who can sign in to the Lepide console, and what each person can see and change."
        actions={<>
          <Button icon="download" onClick={() => toast({ variant: 'success', title: 'Export ready', message: 'lepide-users-2026-11-03.csv' })}>Export</Button>
          <Button variant="primary" icon="user_plus" onClick={openInvite}>Invite user</Button>
        </>}
      />

      <div className="kpis kpis--3">
        <KpiCard label="Console users" value={users.length} delta="+2" deltaDir="up" foot="vs last 30 days" />
        <KpiCard label="Administrators" value={admins} foot="Full access to every module" />
        <KpiCard label="Pending invitations" value={pending} foot={`Links expire after ${saved.expiry} days`} />
      </div>

      <DataTable
        title="All users"
        noun={['user', 'users']}
        rows={users}
        rowKey={(u) => u.id}
        columns={columns}
        search={q}
        initialSort={{ key: 'name', dir: 'asc' }}
        toolbar={<SearchField value={q} onChange={setQ} placeholder="Search users" ariaLabel="Search users" />}
        rowActions={(u) => (
          <Menu
            label={`Actions for ${u.name}`}
            trigger={(p) => <IconButton {...p} icon="more" label="More actions" />}
            items={[
              { label: 'Resend invitation', icon: 'send', disabled: u.status !== 'Invited', reason: 'Only invited users get an invitation email',
                onSelect: () => toast({ title: 'Invitation resent', message: `A new link was sent to ${u.email}.` }) },
              { label: 'Unlock account', icon: 'lock', disabled: u.status !== 'Locked', reason: 'This account isn’t locked',
                onSelect: () => { update(u.id, { status: 'Active' }); toast({ variant: 'success', title: 'Account unlocked', message: `${u.name} can sign in again.` }); } },
              { label: 'Reset MFA', icon: 'key', disabled: u.status !== 'Active', reason: 'Only active users have MFA set up',
                onSelect: () => toast({ title: 'MFA reset', message: `${u.name} sets up MFA again at the next sign-in.` }) },
              { separator: true },
              u.status === 'Disabled'
                ? { label: 'Enable user', icon: 'check',
                  onSelect: () => { update(u.id, { status: 'Active' }); toast({ variant: 'success', title: 'User enabled', message: `${u.name} can sign in again.` }); } }
                : { label: 'Disable user', icon: 'x', danger: true, onSelect: () => setDisabling(u) },
            ]}
          />
        )}
        empty={<EmptyState icon="users" title="No users yet" message="Invite the people who run audits and respond to alerts."
          action={<Button icon="user_plus" onClick={openInvite}>Invite user</Button>} />}
        noResults="No users match this search."
      />

      <SetCard
        title="Invitation defaults"
        description="Used for every new invitation. You can still change the role in the invite dialog."
        footer={<>
          <span className="lf-muted">Last saved 12 Oct 2026 by Ann Lee</span>
          <Button disabled={!dirty} onClick={() => setDraft(saved)}>Cancel</Button>
          <Button variant="primary" disabled={!dirty || !!expiryError} onClick={saveDefaults}>Save changes</Button>
        </>}
      >
        <div className="page-form stack">
          <div className="fld-row">
            <SelectField label="Default role" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} options={ROLES} />
            <NumberField label="Invitation expires after" note="1–30" value={draft.expiry} onChange={(v) => setDraft({ ...draft, expiry: v })}
              min={1} max={30} suffix="days" error={expiryError} />
          </div>
          <SettingRow title="Require MFA on first sign-in" help="New users set up multi-factor authentication before they reach the console.">
            <Checkbox ariaLabel="Require MFA on first sign-in" checked={draft.mfa} onChange={(v) => setDraft({ ...draft, mfa: v })} />
          </SettingRow>
        </div>
      </SetCard>

      <Modal
        open={inviting}
        onClose={() => setInviting(false)}
        size="sm"
        icon="user_plus"
        title="Invite user"
        subtitle={`They get an email with a sign-in link that expires in ${saved.expiry} days.`}
        onSubmit={sendInvite}
        footer={<>
          <Button onClick={() => setInviting(false)}>Cancel</Button>
          <Button variant="primary" icon="send" type="submit">Send invitation</Button>
        </>}
      >
        <TextField label="Email address" type="email" autoComplete="off" placeholder="name@corp.com" value={email} error={emailError}
          onChange={(v) => { setEmail(v); if (emailError) setEmailError(null); }} />
        <SelectField label="Role" value={role} onChange={setRole} options={ROLES}
          help={saved.mfa ? 'They set up multi-factor authentication at their first sign-in.' : undefined} />
      </Modal>

      <ConfirmDialog
        open={!!disabling}
        onClose={() => setDisabling(null)}
        title={`Disable ${disabling?.name ?? 'user'}?`}
        message="They are signed out now and can’t sign in again until an administrator enables the account."
        confirmLabel="Disable user"
        onConfirm={() => {
          if (!disabling) return;
          update(disabling.id, { status: 'Disabled' });
          toast({ variant: 'success', title: 'User disabled', message: `${disabling.name} can no longer sign in.` });
          setDisabling(null);
        }}
      />
    </div>
  );
}
