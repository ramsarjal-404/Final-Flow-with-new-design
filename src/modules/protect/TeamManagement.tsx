/* SCR-PRO-18 Team Management with DLG-PRO-19 / 20 / 21. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, EmptyState, Icon, Modal, PageHeader, useToast } from '../../ui';
import { TEAM_ROOT, type Person } from './data';
import { protectStore, saveTeam } from './store';
import { TreeTable, type TreeNode } from './kit';

type PNode = Person & TreeNode & { children?: PNode[] };
const ROOT = TEAM_ROOT as PNode;
const canEnroll = (p: Person) => p.kind === 'manager' || !!p.canEnroll;
const descendants = (p: Person): string[] => (p.children ?? []).flatMap((c) => [c.id, ...descendants(c)]);
const pathTo = (id: string, n: Person = TEAM_ROOT, acc: Person[] = []): Person[] | null => {
  if (n.id === id) return [...acc, n];
  for (const c of n.children ?? []) { const r = pathTo(id, c, [...acc, n]); if (r) return r; }
  return null;
};
const same = (a: Set<string>, b: string[]) => a.size === b.length && b.every((x) => a.has(x));
const KIND_ICON = { lead: 'star', manager: 'users', employee: 'user' } as const;

/* DLG-PRO-21: the person's position in their manager's hierarchy (GAP-PRO-09 intended). */
function HierarchyPanel({ person, excluded, onClose }: { person: Person | null; excluded: string[]; onClose: () => void }) {
  if (!person) return null;
  const path = pathTo(person.id) ?? [person];
  const manager = path.length > 1 ? path[path.length - 2] : null;
  const row = (p: Person, depth: number, mark = false) => (
    <li key={p.id + depth} className={'protect-hier__row' + (mark ? ' is-sel' : '')} style={{ paddingLeft: 12 + depth * 22 }}>
      <span className={'protect-kind protect-kind--' + p.kind} aria-hidden="true"><Icon name={KIND_ICON[p.kind]} size={13} /></span>
      <b>{p.name}</b>{excluded.includes(p.id) && <span className="lf-chip lf-chip--warn">Excluded</span>}<span className="grow" /><span className="lf-muted">{p.title}</span>
    </li>
  );
  const sub = (p: Person, depth: number): JSX.Element[] => (p.children ?? []).flatMap((c) => [row(c, depth, c.id === person.id), ...sub(c, depth + 1)]);
  const items = manager ? [...path.slice(0, -2).map((p, i) => row(p, i)), row(manager, path.length - 2), ...(manager.children ?? []).flatMap((c) => [row(c, path.length - 1, c.id === person.id), ...(c.id === person.id ? sub(c, path.length) : [])])]
    : [row(person, 0, true), ...sub(person, 1)];
  return (
    <Modal open onClose={onClose} size="md" icon="users" title={`${person.name} hierarchy`}
      subtitle={manager ? `${person.name} reports to ${manager.name}.` : undefined}
      footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      {items.length > 1 || manager ? <ul className="protect-hier">{items}</ul> : <EmptyState compact icon="users" title={`${person.name} has no team members.`} />}
    </Modal>
  );
}

export default function TeamManagement() {
  const nav = useNavigate(); const toast = useToast();
  const saved = protectStore.use((s) => s.team);
  const [dEx, setDEx] = useState<Set<string>>(() => new Set(saved.excluded));
  const [dEn, setDEn] = useState<Set<string>>(() => new Set(saved.enrolled));
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['t0', 't1', 't4']));
  const [pending, setPending] = useState<{ p: Person; on: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [panel, setPanel] = useState<Person | null>(null);
  const [pageRows, setPageRows] = useState<PNode[]>([]);

  const setEx = (ids: string[], on: boolean) => {
    setDEx((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });
    if (on) setDEn((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
  };
  const enrollable = pageRows.filter((r) => r.kind !== 'lead' && canEnroll(r) && !dEx.has(r.id)).map((r) => r.id);
  const allEn = enrollable.length > 0 && enrollable.every((id) => dEn.has(id)); const someEn = enrollable.some((id) => dEn.has(id));
  const exChanged = !same(dEx, saved.excluded); const enChanged = !same(dEn, saved.enrolled);
  const columns = useMemo(() => [
    { key: 'name', header: 'Name', sortable: true, filterable: true, render: (r: PNode) => (
      <span className="protect-person">
        <span className={'protect-kind protect-kind--' + r.kind} aria-hidden="true"><Icon name={KIND_ICON[r.kind]} size={13} /></span>
        <b>{r.name}</b>
        {saved.excluded.includes(r.id) && <button type="button" className="lf-chip lf-chip--warn protect-tagbtn" title={`View ${r.name}'s hierarchy`} onClick={() => setPanel(r)}>Excluded</button>}
      </span>) },
    { key: 'department', header: 'Department', sortable: true, filterable: true },
    { key: 'title', header: 'Job Title', sortable: true, filterable: true },
    { key: 'email', header: 'Email', sortable: true, filterable: true },
    { key: 'exclude', header: 'Exclude', align: 'center' as const, width: 90, render: (r: PNode) => r.kind === 'lead' ? null : (
      <Checkbox ariaLabel={`Exclude ${r.name}`} checked={dEx.has(r.id)} disabled={dEn.has(r.id)}
        onChange={(v) => (r.children?.length ? setPending({ p: r, on: v }) : setEx([r.id], v))} />) },
    { key: 'action', header: 'Action', width: 190, render: (r: PNode) => r.kind === 'lead' ? null : (
      <Button size="sm" icon="shield" disabled={r.kind !== 'manager' || dEx.has(r.id)}
        onClick={() => nav('/protect/policies/new-permission', { state: { from: 'team', manager: r.name } })}>Apply least privilege</Button>) },
    { key: 'enroll', header: 'Enroll', align: 'center' as const, width: 110,
      lead: <span className="protect-thcheck"><Checkbox ariaLabel="Enroll" checked={allEn} indeterminate={someEn && !allEn} disabled={!enrollable.length}
        onChange={() => setDEn((s) => { const n = new Set(s); enrollable.forEach((id) => (allEn ? n.delete(id) : n.add(id))); return n; })} /></span>,
      render: (r: PNode) => r.kind === 'lead' ? null : (
        <Checkbox ariaLabel={`Enroll ${r.name}`} checked={dEn.has(r.id)} disabled={!canEnroll(r) || dEx.has(r.id)}
          onChange={(v) => setDEn((s) => { const n = new Set(s); if (v) n.add(r.id); else n.delete(r.id); return n; })} />) },
  ], [dEx, dEn, saved, allEn, someEn, enrollable.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="sub sub--fill">
      <PageHeader crumbs={[{ label: 'Dashboard', to: '/protect' }, { label: 'Team Management' }]} title="Team Management"
        description="To get started, please select the managers you would like to enroll into your Data Security Protect."
        actions={<Button variant="primary" icon="check" onClick={() => (exChanged || enChanged ? setConfirm(true) : toast({ variant: 'info', title: 'Team Management', message: 'There are no changes to apply.' }))}>Apply</Button>} />
      <TreeTable<PNode> root={[ROOT]} columns={columns} expanded={expanded} nameKey="name" ariaLabel="Team hierarchy" onVisibleChange={setPageRows}
        onToggle={(id) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
        rootRowClass={(r) => (r.kind === 'lead' ? 'protect-leadrow' : undefined)} />

      <Modal open={!!pending} onClose={() => setPending(null)} size="xs" icon="alert" title="Do you want these changes to be reflected in your hierarchy as well?"
        subtitle="Apply to hierarchy"
        footer={<>
          <Button onClick={() => { if (pending) setEx([pending.p.id], pending.on); setPending(null); }}>No</Button>
          <Button variant="primary" data-autofocus onClick={() => { if (pending) setEx([pending.p.id, ...descendants(pending.p)], pending.on); setPending(null); }}>Yes</Button>
        </>} />

      <Modal open={confirm} onClose={() => setConfirm(false)} size="xs" icon="alert" tone="danger"
        title={exChanged ? 'Do you really want to proceed with these modifications?' : 'Do you really want to proceed with these enrollments ?'}
        subtitle={`${dEx.size} excluded · ${dEn.size} enrolled after this change.`}
        footer={<>
          <Button onClick={() => { setDEx(new Set(saved.excluded)); setDEn(new Set(saved.enrolled)); setConfirm(false); }}>Discard</Button>
          <Button variant="primary" onClick={() => { saveTeam([...dEx], [...dEn]); setConfirm(false); toast({ variant: 'success', title: 'Success!', message: 'Team management data has been saved successfully.' }); }}>Done</Button>
        </>} />
      <HierarchyPanel person={panel} excluded={saved.excluded} onClose={() => setPanel(null)} />
    </div>
  );
}

