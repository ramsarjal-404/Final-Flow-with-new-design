import { Fragment, useState } from 'react';
import { Button, ConfirmDialog, EmptyState, Icon, IconButton, Modal, SelectField, TextField, useToast } from '../../../ui';
import { ds$, dsStore, newId } from './store';
import type { DomainObject, GroupUser, UserGroup } from './store';
import { ConsoleChrome, MiniTable, PortalMenu, useInvalid } from './parts';
import DomainPicker from './DomainPicker';

/* SCR-SDS-06 Users Configuration + DLG-SDS-25/26/27. */

export default function UserGroups() {
  const toast = useToast();
  const groups = dsStore.use((s) => s.groups);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [groupDlg, setGroupDlg] = useState<{ editId?: string } | null>(null);
  const [userEdit, setUserEdit] = useState<{ groupId: string; user: GroupUser } | null>(null);
  const [del, setDel] = useState<UserGroup | null>(null);

  return (
    <ConsoleChrome current="users" title="Users configuration" crumbs={[{ label: 'User group' }]} icon="users"
      // GAP-SDS-10: the built subtitle lacked the space after "users.".
      subtitle="Get an overview of all users. Use options to Add, Modify and Remove users and audit policies applied on users and groups, according to need."
      actions={<Button variant="primary" icon="plus" onClick={() => setGroupDlg({})}>Add new user group</Button>}>
      {groups.length === 0 ? (
        <section className="lf-card tablecard" style={{ minHeight: 320 }}>
          <EmptyState icon="users" title="No user groups yet. Click Add New User Group to create one." />
        </section>
      ) : (
        <section className="lf-card tablecard">
          <div className="tbl-wrap">
            <table className="lf-table lf-table--auto" aria-label="User groups" role="treegrid">
              <thead><tr><th>User Name</th><th>Domain/File Server</th><th>User Type</th><th>User Policy</th><th>Description</th><th style={{ width: 100 }}>Actions</th></tr></thead>
              <tbody>
                {groups.map((g) => {
                  const open = !collapsed.includes(g.id);
                  return (
                    <Fragment key={g.id}>
                      <tr className="lf-row add-data-source-tree-group" style={{ cursor: 'default' }} aria-level={1} aria-expanded={open}>
                        <td colSpan={5}>
                          <span className="tree-cell">
                            <button type="button" className="tree-toggle" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${g.name}`}
                              onClick={() => setCollapsed((c) => (open ? [...c, g.id] : c.filter((x) => x !== g.id)))}><Icon name="chevron-right" /></button>
                            <b>{g.name}</b><span className="add-data-source-tree-meta">(Users: {g.users.length}, Policy: {g.policy.toLowerCase()})</span>
                          </span>
                        </td>
                        <td>
                          <span className="row" style={{ gap: 4 }}>
                            <IconButton icon="edit" label={`Edit ${g.name}`} onClick={() => setGroupDlg({ editId: g.id })} />
                            <IconButton icon="trash" danger label={`Delete ${g.name}`} onClick={() => setDel(g)} />
                          </span>
                        </td>
                      </tr>
                      {open && g.users.map((u) => (
                        <tr key={u.id} className="lf-row" style={{ cursor: 'default' }} aria-level={2}>
                          <td><span className="tree-cell"><span className="tree-spacer" /><span className="tree-spacer" />{u.name}</span></td>
                          <td>{u.domain}</td><td>{u.type}</td><td>{u.policy}</td><td>{u.description || <span className="lf-na">—</span>}</td>
                          <td><IconButton icon="edit" label={`Edit ${u.name}`} onClick={() => setUserEdit({ groupId: g.id, user: u })} /></td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {groupDlg && <GroupDialog editId={groupDlg.editId} onClose={() => setGroupDlg(null)} />}
      {userEdit && (
        <UserDialog mode="edit" initial={userEdit.user} onClose={() => setUserEdit(null)}
          onDone={(u) => {
            const g = dsStore.get().groups.find((x) => x.id === userEdit.groupId);
            if (g) ds$.saveGroup({ ...g, users: g.users.map((x) => (x.id === u.id ? u : x)) });
            toast({ variant: 'success', title: 'User updated', message: u.name });
            setUserEdit(null);
          }} />
      )}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} confirmLabel="Delete" title="Delete user group"
        message={del ? `Delete "${del.name}" and its ${del.users.length} user(s)? This can't be undone.` : undefined}
        onConfirm={() => {
          const g = del!; setDel(null);
          dsStore.set((s) => ({ ...s, groups: s.groups.filter((x) => x.id !== g.id) }));
          toast({ variant: 'success', title: 'User group deleted', message: g.name });
        }} />
    </ConsoleChrome>
  );
}

/* ---------------- DLG-SDS-25 ---------------- */
function GroupDialog({ editId, onClose }: { editId?: string; onClose: () => void }) {
  const toast = useToast();
  const st = dsStore.use();
  const editing = editId ? st.groups.find((g) => g.id === editId) ?? null : null;
  const policyNames = st.policies.map((p) => p.name);
  const [name, setName] = useState(editing?.name ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [policy, setPolicy] = useState(editing?.policy && policyNames.includes(editing.policy) ? editing.policy : 'Audit All');
  const [users, setUsers] = useState<GroupUser[]>(editing?.users.map((u) => ({ ...u })) ?? []);
  const [nested, setNested] = useState<'ad' | 'manual' | 'local' | null>(null);
  const v = useInvalid();

  const addUsers = (list: GroupUser[]) => setUsers((us) => {
    const out = [...us];
    for (const u of list) if (!out.some((x) => x.name.toLowerCase() === u.name.toLowerCase() && x.domain.toLowerCase() === u.domain.toLowerCase())) out.push(u);
    return out;
  });
  const fromAd = (objs: DomainObject[]) => {
    setNested(null);
    addUsers(objs.map((o) => ({ id: newId('u'), name: o.name, domain: 'chilly', type: o.objectClass === 'group' ? 'domain group' : 'domain user', policy: '', description: '' })));
  };
  const done = () => {
    const n = name.trim();
    if (!n) { v.mark(['name']); toast({ variant: 'error', title: 'Group Name required', message: 'Enter a name for the user group.' }); return; }
    if (st.groups.some((g) => g.id !== editing?.id && g.name.toLowerCase() === n.toLowerCase())) { v.mark(['name']); toast({ variant: 'error', title: 'Name in use', message: `A group named ${n} already exists.` }); return; }
    if (!users.length) { toast({ variant: 'error', title: 'Add users', message: 'Use Add to put at least one user in the group.' }); return; }
    const g: UserGroup = { id: editing?.id ?? newId('g'), name: n, description: desc.trim(), policy, users: users.map((u) => ({ ...u, policy: policy.toLowerCase() })) };
    ds$.saveGroup(g);
    toast({ variant: 'success', title: editing ? 'User group updated' : 'User group added', message: `${n} · ${users.length} user(s)` });
    onClose();
  };

  return (
    <>
      <Modal open onClose={onClose} title="Enter group name and add users to the group." icon="users" size="lg" escapeCloses={!nested}
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!users.length} onClick={done}>Done</Button></>}>
        <h4 className="add-data-source-sub">{editing ? 'Edit User Group' : 'Add new user group'}</h4>
        <div className="add-data-source-three">
          <TextField label="Group Name" value={name} maxLength={256} aria-invalid={v.inv('name')} onChange={(x) => { setName(x); v.clear('name'); }} />
          <TextField label="Description" value={desc} maxLength={512} onChange={setDesc} />
          <SelectField label="Apply policy" value={policy} options={policyNames} onChange={setPolicy} />
        </div>
        <div className="row row--between">
          <b className="text-sm">Select user to add to user group</b>
          <PortalMenu label="Add users"
            items={[
              { label: 'From AD ›', onSelect: () => setNested('ad') },
              { label: 'Manually', onSelect: () => setNested('manual') },
              { label: 'Local user', onSelect: () => setNested('local') },
            ]}
            trigger={(p) => <Button ref={p.ref} icon="plus" iconEnd="chevron" onClick={p.onClick} aria-expanded={p['aria-expanded']} aria-haspopup="menu">Add</Button>} />
        </div>
        <MiniTable label="Users in the group" head={<><th>User Name</th><th>Domain/File Server</th><th>User Type</th><th style={{ width: 90 }}>Actions</th></>}>
          {users.length === 0 ? <tr className="add-data-source-empty-row"><td colSpan={4}>No users yet.</td></tr> : users.map((u) => (
            <tr key={u.id} className="lf-row" style={{ cursor: 'default' }}>
              <td>{u.name}</td><td>{u.domain}</td><td>{u.type}</td>
              <td><IconButton icon="trash" danger label={`Remove ${u.name}`} onClick={() => setUsers((us) => us.filter((x) => x.id !== u.id))} /></td>
            </tr>
          ))}
        </MiniTable>
      </Modal>
      {nested === 'ad' && <DomainPicker kind="users" multi onClose={() => setNested(null)} onDone={fromAd} />}
      {(nested === 'manual' || nested === 'local') && (
        <UserDialog mode={nested} onClose={() => setNested(null)} onDone={(u) => { setNested(null); addUsers([u]); }} />
      )}
    </>
  );
}

/* ---------------- DLG-SDS-26 ---------------- */
function UserDialog({ mode, initial, onClose, onDone }: { mode: 'manual' | 'local' | 'edit'; initial?: GroupUser; onClose: () => void; onDone: (u: GroupUser) => void }) {
  const toast = useToast();
  const servers = dsStore.use((s) => s.servers);
  const local = mode === 'local' || (mode === 'edit' && initial?.type === 'local user');
  const [name, setName] = useState(initial?.name ?? '');
  const [domain, setDomain] = useState(initial?.domain ?? (mode === 'local' ? '' : 'chilly'));
  const [desc, setDesc] = useState(initial?.description ?? '');
  const v = useInvalid();
  const title = mode === 'edit' ? 'Edit user' : mode === 'local' ? 'Add Local User' : 'Add User Manually';
  const submit = () => {
    if (!name.trim() || !domain.trim()) {
      v.mark([!name.trim() && 'name', !domain.trim() && 'domain'].filter(Boolean) as string[]);
      toast({ variant: 'error', title: 'Required fields', message: local ? 'Enter the user name and pick the file server.' : 'Enter the user name and domain.' }); return;
    }
    onDone({
      id: initial?.id ?? newId('u'), name: name.trim(), domain: domain.trim(), description: desc.trim(),
      type: initial?.type ?? (local ? 'local user' : 'domain user'), policy: initial?.policy ?? '',
    });
  };
  return (
    <Modal open onClose={onClose} title={title} icon={mode === 'edit' ? 'edit' : 'user_plus'} size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>{mode === 'edit' ? 'Save' : 'Add'}</Button></>}>
      <TextField label="User Name" value={name} placeholder={local ? '.\\UserName' : 'Domain\\UserName'} maxLength={256} aria-invalid={v.inv('name')} onChange={(x) => { setName(x); v.clear('name'); }} />
      {local
        ? <SelectField label="File Server" value={domain} placeholder="Select" options={servers.map((s) => s.name)} aria-invalid={v.inv('domain')} onChange={(x) => { setDomain(x); v.clear('domain'); }} />
        : <TextField label="Domain" value={domain} maxLength={256} aria-invalid={v.inv('domain')} onChange={(x) => { setDomain(x); v.clear('domain'); }} />}
      <TextField label="Description" value={desc} maxLength={512} onChange={setDesc} />
    </Modal>
  );
}
