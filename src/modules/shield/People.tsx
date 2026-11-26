/* AI Shield › People (/shield/people): role filter, people table, the "Add person" drawer, the edit drawer (reset
   password, left the directory) and the remove confirmation. */
import { useState } from 'react';
import {
  Button, ConfirmDialog, DataTable, Drawer, Icon, Person, RadioGroup, SearchField, Segmented, SelectField, TextField, ToneTag, useToast,
  type Column,
} from '../../ui';
import { ROLES, SIGN_IN_SOURCES, UNITS } from './data';
import { addPerson, markLeftDirectory, removePerson, resetPassword, shieldStore, updatePerson } from './store';
import { ago, RoleChip, ShieldPage } from './parts';
import { RowMenu } from './RowMenu';
import type { Role, ShieldPerson, SignInSource, Unit } from './types';

const STATUS_LABELS: Record<ShieldPerson['status'], string> = { active: 'Active', invited: 'Invited', left: 'Left the directory' };
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
/** Roles an admin can give. Owners are appointed by an Owner, not from here. */
const ROLE_OPTIONS = [{ value: 'user', label: 'User' }, { value: 'approver', label: 'Approver' }, { value: 'admin', label: 'Admin' }];
const OWNER_REASON = 'Owners are managed by an Owner';

type Filter = Role | 'all';

export function People() {
  const toast = useToast();
  const people = shieldStore.use((s) => s.people);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ShieldPerson | null>(null);
  const [removing, setRemoving] = useState<ShieldPerson | null>(null);

  const rows = people.filter((p) => filter === 'all' || p.role === filter);
  const countOf = (f: Filter) => (f === 'all' ? people.length : people.filter((p) => p.role === f).length);

  const columns: Column<ShieldPerson>[] = [
    {
      key: 'name', header: 'Person', sortable: true, filterable: true, minWidth: 240,
      render: (p) => <span className="row"><Person name={p.name} sub={p.email} />{p.you && <span className="shield-you">You</span>}</span>,
    },
    { key: 'role', header: 'Role', value: (p) => ROLES[p.role].label, sortable: true, filterable: true, width: 130, render: (p) => <RoleChip role={p.role} /> },
    {
      key: 'unit', header: 'Unit', value: (p) => p.unit ?? '', sortable: true, filterable: true, width: 130,
      render: (p) => p.unit ?? <span className="lf-na">—</span>,
    },
    { key: 'source', header: 'Signs in with', value: (p) => SIGN_IN_SOURCES[p.source], sortable: true, filterable: true, width: 190 },
    {
      key: 'status', header: 'Status', value: (p) => STATUS_LABELS[p.status], sortable: true, width: 160,
      render: (p) => <ToneTag tone={p.status === 'active' ? 'good' : p.status === 'invited' ? 'warn' : 'bad'}>{STATUS_LABELS[p.status]}</ToneTag>,
    },
    {
      key: 'lastActive', header: 'Last active', value: (p) => (p.lastActive ? new Date(p.lastActive).getTime() : 0), sortable: true, width: 150,
      render: (p) => ago(p.lastActive),
    },
  ];

  return (
    <ShieldPage
      tab="people"
      title="People"
      fill
      description="Everyone this server knows about: the owners and admins who run it, the approvers who decide requests, and the people whose AI use it protects."
      actions={<Button variant="primary" icon="user_plus" onClick={() => setAdding(true)}>Add person</Button>}
    >
      <div className="stack">
        <Segmented
          ariaLabel="Role"
          hug
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          items={[
            { value: 'all', label: 'Everyone', count: countOf('all') },
            { value: 'admin', label: 'Admins', count: countOf('admin') },
            { value: 'approver', label: 'Approvers', count: countOf('approver') },
            { value: 'user', label: 'People', count: countOf('user') },
          ]}
        />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          title="People"
          noun={['person', 'people']}
          search={search}
          defaultPageSize={25}
          toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search people…" />}
          isRowDisabled={(p) => p.status === 'left'}
          rowActions={(p) => (
            <RowMenu
              label={`Manage ${p.name}`}
              items={[
                { label: 'Edit', icon: 'edit', onSelect: () => setEditing(p), disabled: p.role === 'owner', reason: p.role === 'owner' ? OWNER_REASON : undefined },
                {
                  label: 'Remove', icon: 'trash', onSelect: () => setRemoving(p), disabled: p.role === 'owner' || !!p.you,
                  reason: p.role === 'owner' ? OWNER_REASON : p.you ? "You can't remove yourself" : undefined,
                },
              ]}
            />
          )}
        />
      </div>

      <AddPersonDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(p) => {
          setAdding(false);
          toast({
            variant: 'success',
            title: `${p.name} added`,
            message: p.status === 'invited'
              ? `${ROLES[p.role].label} · signs in through ${SIGN_IN_SOURCES[p.source]}. Access opens at their first sign-in.`
              : `${ROLES[p.role].label} · local account.`,
          });
        }}
      />
      {editing && <EditPersonDrawer person={editing} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        confirmLabel={removing ? `Remove ${removing.name.split(' ')[0]}` : 'Remove'}
        title={removing ? `Remove ${removing.name}?` : ''}
        message={removing?.role === 'approver'
          ? 'They can no longer decide requests. Blocked people will wait until another approver is appointed.'
          : 'They lose access to the console. Their history stays in the audit trail.'}
        onConfirm={() => {
          if (removing) {
            removePerson(removing.id);
            toast({ variant: 'success', title: 'Person removed', message: `${removing.name} no longer has access.` });
          }
          setRemoving(null);
        }}
      />
    </ShieldPage>
  );
}

const SOURCE_OPTIONS = [
  { value: 'ad', label: 'Active Directory' },
  { value: 'entra', label: 'Microsoft Entra ID' },
  { value: 'local', label: 'Local account' },
];

/** Drawer "Add person": name, email, role, where the account lives, unit. Errors show after the first submit. */
function AddPersonDrawer({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (p: ShieldPerson) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [source, setSource] = useState<SignInSource>('ad');
  const [unit, setUnit] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const reset = () => { setName(''); setEmail(''); setRole('user'); setSource('ad'); setUnit(''); setSubmitted(false); };
  const close = () => { reset(); onClose(); };
  const errors = {
    name: name.trim() ? null : 'Enter their full name.',
    email: isEmail(email) ? null : 'Enter a valid work email.',
  };
  const submit = () => {
    setSubmitted(true);
    if (errors.name || errors.email) return;
    const person = addPerson({ name: name.trim(), email: email.trim().toLowerCase(), role, source, unit: (unit || undefined) as Unit | undefined });
    reset();
    onAdded(person);
  };

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Add person"
      subtitle="Give them a role, and say where their account lives."
      width={520}
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={submit}>Add person</Button></>}
    >
      <div className="page-form stack">
        <TextField label="Full name" value={name} onChange={setName} error={submitted ? errors.name : null} autoFocus />
        <TextField label="Email" type="email" placeholder="name@company.com" value={email} onChange={setEmail} error={submitted ? errors.email : null} />
        <SelectField label="Role" value={role} onChange={(v) => setRole(v as Role)} help={ROLES[role].blurb} options={ROLE_OPTIONS} />
        <div className="fld">
          <span className="fld__lbl">Signs in with</span>
          <RadioGroup value={source} onChange={(v) => setSource(v as SignInSource)} options={SOURCE_OPTIONS} />
          <small className="help">
            {source === 'local'
              ? 'This server holds the password. You will get a one-time password to pass on.'
              : `Their password lives in ${SIGN_IN_SOURCES[source]}; this server never holds it.`}
          </small>
        </div>
        <SelectField label="Unit" note="optional" placeholder="Select" value={unit} onChange={setUnit} options={UNITS} />
        <p className="lf-muted" style={{ margin: 0, fontSize: 12.5 }}>Owners are appointed by an Owner, not from here.</p>
      </div>
    </Drawer>
  );
}

/** Drawer to edit a person and help them back in: local accounts get a one-time password; directory accounts can be
    marked as having left the directory (what the sync would do). */
function EditPersonDrawer({ person, onClose }: { person: ShieldPerson; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email);
  const [role, setRole] = useState<Role>(person.role);
  const [unit, setUnit] = useState<string>(person.unit ?? '');
  const [oneTimePassword, setOneTimePassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isLocal = person.source === 'local';

  const save = () => {
    if (!name.trim() || !isEmail(email)) {
      toast({ variant: 'error', title: 'Check the details', message: 'A full name and a valid email are needed.' });
      return;
    }
    updatePerson(person.id, { name: name.trim(), email: email.trim().toLowerCase(), role, unit: (unit || undefined) as Unit | undefined });
    toast({ variant: 'success', title: 'Saved', message: `${name.trim()} is up to date.` });
    onClose();
  };
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(oneTimePassword ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked: nothing to do */ }
  };
  const leftDirectory = () => {
    markLeftDirectory(person.id);
    toast({ variant: 'info', title: 'Removed from directory', message: `${person.name} can no longer sign in. History kept.` });
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={person.name}
      subtitle="Change their details, or help them back in if they can't sign in."
      width={520}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save changes</Button></>}
    >
      <div className="page-form stack">
        <TextField label="Full name" value={name} onChange={setName} autoFocus />
        <TextField label="Email" type="email" value={email} onChange={setEmail} />
        <SelectField label="Role" value={role} onChange={(v) => setRole(v as Role)} help={ROLES[role].blurb} disabled={!!person.you} options={ROLE_OPTIONS} />
        <SelectField label="Unit" note="optional" placeholder="Select" value={unit} onChange={setUnit} options={UNITS} />
        <div className="fld">
          <span className="fld__lbl">Signs in with</span>
          <p style={{ margin: 0, font: '500 14px/20px var(--font)' }}>{SIGN_IN_SOURCES[person.source]}</p>
          <small className="help">Comes from their account, set when they were added. Not editable here.</small>
        </div>

        <section>
          <p className="shield-section">Getting back in</p>
          {isLocal ? (
            <>
              <div className="shield-access">
                <div className="shield-access__copy">
                  <b>Reset their password</b>
                  <small>You get a one-time password to pass on. They choose their own the moment they sign in with it.</small>
                </div>
                <Button icon="key" onClick={() => setOneTimePassword(resetPassword(person.id))}>Reset password</Button>
              </div>
              {oneTimePassword && (
                <div className="shield-otp">
                  <div>
                    <small className="lf-muted">One-time password · shown once</small>
                    <br />
                    <code>{oneTimePassword}</code>
                  </div>
                  <Button size="sm" icon={copied ? 'check' : 'copy'} onClick={copyPassword}>{copied ? 'Copied' : 'Copy'}</Button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="lf-muted" style={{ margin: '0 0 8px', fontSize: 13 }}>
                <b style={{ color: 'var(--ink)' }}>{person.name.split(' ')[0]} signs in through {SIGN_IN_SOURCES[person.source]}.</b>
                {" Their password lives there, so it's reset there too. This server never holds it."}
              </p>
              {person.status !== 'left' && !person.you && (
                <div className="shield-access">
                  <div className="shield-access__copy">
                    <b>Simulate: they leave the organisation</b>
                    <small>
                      Plays what the directory sync does by itself: sign-in closes, their history stays, and if they held a role the
                      Overview raises it.
                    </small>
                  </div>
                  <Button onClick={leftDirectory}>Left the directory</Button>
                </div>
              )}
            </>
          )}
        </section>

        {person.status === 'left' && (
          <p className="lf-muted" style={{ margin: 0 }}>
            <Icon name="info" size={13} /> This account has left the directory. Sign-in is closed; history is kept.
          </p>
        )}
      </div>
    </Drawer>
  );
}
