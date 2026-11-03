import { useMemo, useState } from 'react';
import { Button, Checkbox, Chip, ConfirmDialog, EmptyState, Field, IconButton, Modal, Person, RadioGroup, SearchField, useToast } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { ROLES, adminActions, adminStore, formatDateTime, useDateFormat, type Member, type Role } from '../../../stores/admin';
import { AdminTable, ReadOnlyField, useTable, type Col } from '../general/kit';
import { AddMembersDialog } from './AddMembersDialog';
import './styles.css';

/* SCR-SAD-02 · Role Management (default Settings landing) with DLG-SAD-02 … DLG-SAD-04.
   Selection lives in page state; bulk actions act only on the selected rows that are visible
   (search + column filters). No pagination on this page. */

export default function RoleManagementPage() {
  const toast = useToast();
  const members = adminStore.use((s) => s.members);
  const fmt = useDateFormat();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [pendingRemove, setPendingRemove] = useState<Member[] | null>(null);

  const cols = useMemo<Col<Member>[]>(() => [
    { key: 'name', header: 'Members', sortable: true, filterable: true, tip: true, minWidth: 200, render: (m) => <Person name={m.name} /> },
    { key: 'logonId', header: 'Logon id', sortable: true, filterable: true, tip: true, minWidth: 220 },
    { key: 'domain', header: 'Domain', sortable: true, filterable: true, minWidth: 120 },
    { key: 'addedOn', header: 'Added On', sortable: true, filterable: true, minWidth: 190, text: (m) => formatDateTime(m.addedOn, fmt), sortValue: (m) => Date.parse(m.addedOn) },
    { key: 'type', header: 'Type', sortable: true, filterable: true, width: 110 },
    { key: 'role', header: 'Role', sortable: true, filterable: true, width: 140, render: (m) => <Chip tone={m.role === 'Admin' ? 'brand' : 'neutral'}>{m.role}</Chip> },
  ], [fmt]);

  const model = useTable(members, cols, {
    search, searchText: (m) => `${m.name} ${m.logonId} ${m.domain} ${m.type} ${m.role}`, initialSort: { key: 'name', dir: 'asc' },
  });
  const visibleIds = model.list.map((m) => m.id);
  const visibleSelected = selected.filter((id) => visibleIds.includes(id));
  const allVisible = visibleIds.length > 0 && visibleSelected.length === visibleIds.length;

  const toggleAll = () => setSelected((s) => (allVisible ? s.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...s, ...visibleIds]))));

  const confirmRemove = () => {
    if (!pendingRemove) return;
    const ids = pendingRemove.map((m) => m.id);
    const n = adminActions.removeMembers(ids);
    setSelected((s) => s.filter((id) => !ids.includes(id)));
    setPendingRemove(null);
    toast({ variant: 'success', title: 'Member(s) removed', message: `${n} member(s) removed.` });
  };

  const removeMessage = pendingRemove && (pendingRemove.length === 1
    ? `Remove ${pendingRemove[0].name} (${pendingRemove[0].logonId})? They lose access to the console.`
    : `Remove ${pendingRemove.length} members? They lose access to the console.`);

  return (
    <>
      <HeaderActions>
        {members.length > 0 && (
          <Checkbox label="Select All Member(s)" checked={allVisible} indeterminate={visibleSelected.length > 0 && !allVisible} onChange={toggleAll} />
        )}
        <SearchField className="rm-search" value={search} onChange={setSearch} placeholder="Search" ariaLabel="Search members" />
        <Button variant="danger" icon="trash" disabled={visibleSelected.length === 0}
          onClick={() => setPendingRemove(members.filter((m) => visibleSelected.includes(m.id)))}>Remove members</Button>
        <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add Member(s)</Button>
      </HeaderActions>

      <AdminTable model={model} cols={cols} rowKey={(m) => m.id} label="Members" selectable selected={selected} onSelectedChange={setSelected}
        empty={<EmptyState compact icon="users" title="You don't have any member(s) here, please click on Add Member(s) button to add new Member(s) !" />}
        rowActions={(m) => (
          <>
            <IconButton icon="edit" label={`Change role of ${m.name}`} data-tip="Change role" onClick={() => setEditing(m)} />
            <IconButton icon="trash" danger label={`Remove ${m.name}`} data-tip="Remove member" onClick={() => setPendingRemove([m])} />
          </>
        )} />

      <AddMembersDialog open={adding} onClose={() => setAdding(false)} />
      <ChangeRoleDialog member={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog open={!!pendingRemove} onClose={() => setPendingRemove(null)} onConfirm={confirmRemove}
        title="Remove members" message={removeMessage} confirmLabel="Remove" icon="trash" />
    </>
  );
}

/* DLG-SAD-03 · Change Role */
function ChangeRoleDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const toast = useToast();
  const [role, setRole] = useState<Role>('Admin');
  const [forId, setForId] = useState<string | null>(null);
  if (member && forId !== member.id) { setForId(member.id); setRole(member.role); }
  if (!member && forId !== null) setForId(null);

  const update = () => {
    if (!member) return;
    if (adminActions.changeRole(member.id, role)) toast({ variant: 'success', title: 'Role updated', message: `${member.name} is now ${role}.` });
    onClose();
  };

  return (
    <Modal open={!!member} onClose={onClose} title="Change Role" icon="users" size="xs"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={update}>Update</Button></>}>
      {member && (
        <>
          <ReadOnlyField label="Member" value={`${member.name} (${member.logonId})`} />
          <Field label="Role">
            <RadioGroup ariaLabel="Role" value={role} onChange={(v) => setRole(v as Role)} options={ROLES} />
          </Field>
        </>
      )}
    </Modal>
  );
}
