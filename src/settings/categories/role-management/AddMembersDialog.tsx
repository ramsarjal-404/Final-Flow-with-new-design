import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, EmptyState, IconButton, Modal, SelectField, useToast } from '../../../ui';
import { ROLES, adminActions, adminStore, directoryFor, type DirectoryEntry, type MemberType, type Role } from '../../../stores/admin';

/* DLG-SAD-02 · Select User(s) or Group(s) — MemberPicker: browse a managed domain, move entries to the
   selection by drag-and-drop or "Add selected" (keyboard path), choose a role, add. */

const labelOf = (e: DirectoryEntry) => (e.type === 'User' ? e.id : e.name);
const titleFor = (types: MemberType[]) => {
  const u = types.includes('User'), g = types.includes('Group');
  return u && !g ? 'User(s) Name' : g && !u ? 'Group(s) Name' : 'User(s) / Group(s) Name';
};

export function AddMembersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const domains = adminStore.use((s) => s.domains);
  const [domain, setDomain] = useState('');
  const [browsed, setBrowsed] = useState<MemberType | null>(null);
  const [list, setList] = useState<DirectoryEntry[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [selection, setSelection] = useState<DirectoryEntry[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [role, setRole] = useState<Role>('Admin');
  const [over, setOver] = useState(false);
  const carried = useRef<DirectoryEntry[] | null>(null);

  // Opening always resets the dialog.
  useEffect(() => {
    if (!open) return;
    setDomain(''); setBrowsed(null); setList([]); setChecked([]); setSelection([]); setPicked([]); setRole('Admin'); setOver(false);
  }, [open]);

  const browse = (type: MemberType) => {
    if (!domain) { toast({ variant: 'error', title: 'Select a domain', message: 'Choose the domain to browse first.' }); return; }
    setList(directoryFor(domain, type)); setBrowsed(type); setChecked([]);
  };

  const moveIn = (entries: DirectoryEntry[]) => {
    setSelection((sel) => [...sel, ...entries.filter((e) => !sel.some((s) => s.id === e.id))]);
    setChecked([]);
  };

  /* drag contract: a checked row carries every checked row; an unchecked row carries itself and becomes the only checked row */
  const onDragStart = (e: React.DragEvent, row: DirectoryEntry) => {
    let payload: DirectoryEntry[];
    if (checked.includes(row.id)) payload = list.filter((x) => checked.includes(x.id));
    else { payload = [row]; setChecked([row.id]); }
    carried.current = payload;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', payload.map((p) => p.id).join('\n'));
  };
  const onDragEnd = () => { carried.current = null; setOver(false); };

  const add = () => {
    if (selection.length === 0) {
      toast({ variant: 'error', title: 'Nothing to add', message: 'Drag and drop at least one user or group into the selection.' });
      return;
    }
    const dom = domain || selection[0].id.split('@').pop() || '';
    const { added, skipped } = adminActions.addMembers(selection, dom, role);
    if (added === 0) toast({ variant: 'info', title: 'Already members', message: 'Everyone you selected is already a member.' });
    else toast({ variant: 'success', title: 'Member(s) added', message: `${added} member(s) added as ${role}.` + (skipped ? ` ${skipped} already had access.` : '') });
    onClose();
  };

  const allChecked = list.length > 0 && checked.length === list.length;
  const allPicked = selection.length > 0 && picked.length === selection.length;
  const dirTitle = browsed === 'User' ? 'User(s) Name' : browsed === 'Group' ? 'Group(s) Name' : 'User(s) / Group(s) Name';

  return (
    <Modal open={open} onClose={onClose} title="Select User(s) or Group(s)" icon="user_plus" size="lg"
      footer={<Button variant="primary" onClick={add}>Add</Button>}>
      <div className="rm-top">
        <span className="rm-top__lbl" id="rm-domain-lbl">Select Domain</span>
        <SelectField aria-labelledby="rm-domain-lbl" value={domain} placeholder="Select" options={domains.map((d) => d.domain)}
          onChange={(v) => { setDomain(v); setChecked([]); }} />
        <Button className="rm-browse" aria-pressed={browsed === 'Group'} icon="users" onClick={() => browse('Group')}>Browse Group(s)</Button>
        <Button className="rm-browse" aria-pressed={browsed === 'User'} icon="user" onClick={() => browse('User')}>Browse User(s)</Button>
      </div>

      <div className="rm-picker">
        {/* Directory pane */}
        <section className="rm-pane" aria-label="Directory">
          <header className="rm-pane__head">
            {list.length > 0 && (
              <Checkbox ariaLabel="Select all" checked={allChecked} indeterminate={checked.length > 0 && !allChecked}
                onChange={() => setChecked(allChecked ? [] : list.map((x) => x.id))} />
            )}
            <span className="rm-pane__title">{dirTitle}</span>
            {list.length > 0 && (
              <Button size="sm" icon="arrow" disabled={checked.length === 0} onClick={() => moveIn(list.filter((x) => checked.includes(x.id)))}>
                {checked.length ? `Add Selected (${checked.length})` : 'Add selected'}
              </Button>
            )}
          </header>
          {list.length === 0 ? (
            <p className="rm-hint">{domain ? 'Click Browse User(s) or Browse Group(s) to list this domain.' : 'Select a domain, then browse its users or groups.'}</p>
          ) : (
            <ul className="rm-pane__list">
              {list.map((row) => (
                <li key={row.id} className="rm-row" draggable onDragStart={(e) => onDragStart(e, row)} onDragEnd={onDragEnd}>
                  <Checkbox label={labelOf(row)} checked={checked.includes(row.id)}
                    onChange={(on) => setChecked((c) => (on ? [...c, row.id] : c.filter((x) => x !== row.id)))} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Selection pane (drop target) */}
        <section className={'rm-pane' + (over ? ' is-over' : '')} aria-label="Selected users and groups"
          onDragOver={(e) => { if (!carried.current) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!over) setOver(true); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false); }}
          onDrop={(e) => { e.preventDefault(); setOver(false); if (carried.current) moveIn(carried.current); carried.current = null; }}>
          {selection.length === 0 ? (
            <EmptyState compact icon="users" title="Drag and Drop Any Selected Group(s) or User(s)" />
          ) : (
            <>
              <header className="rm-pane__head">
                <Checkbox ariaLabel="Select all selected" checked={allPicked} indeterminate={picked.length > 0 && !allPicked}
                  onChange={() => setPicked(allPicked ? [] : selection.map((x) => x.id))} />
                <span className="rm-pane__title">{titleFor(selection.map((s) => s.type))}</span>
                <IconButton icon="trash" danger label="Remove checked from selection" data-tip="Remove checked" disabled={picked.length === 0}
                  onClick={() => { setSelection((s) => s.filter((x) => !picked.includes(x.id))); setPicked([]); }} />
                <span className="rm-role">
                  <span id="rm-role-lbl">Role</span>
                  <SelectField aria-labelledby="rm-role-lbl" value={role} options={ROLES} onChange={(v) => setRole(v as Role)} />
                </span>
              </header>
              <ul className="rm-pane__list">
                {selection.map((row) => (
                  <li key={row.id} className="rm-row">
                    <Checkbox label={labelOf(row)} checked={picked.includes(row.id)}
                      onChange={(on) => setPicked((p) => (on ? [...p, row.id] : p.filter((x) => x !== row.id)))} />
                    {picked.length === 0 && (
                      <IconButton icon="x" danger label={`Remove ${row.id}`} data-tip="Remove" size={14}
                        onClick={() => setSelection((s) => s.filter((x) => x.id !== row.id))} />
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </Modal>
  );
}
