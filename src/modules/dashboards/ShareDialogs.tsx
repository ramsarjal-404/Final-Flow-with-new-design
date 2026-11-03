import { useEffect, useState } from 'react';
import { Button, Checkbox, Modal, RadioGroup, SearchField, useToast } from '../../ui';
import { useAuth } from '../../app/auth';
import { PRINCIPALS, dashStore, setShare, type Dashboard, type ShareKind } from './store';

/* DLG-DSH-04 · Shared With and DLG-DSH-05 · Select User(s) or Group(s) (screens.md). */

const KINDS = [{ value: 'groups', label: 'Group(s)' }, { value: 'users', label: 'User(s)' }];
const nameHead = (k: ShareKind) => (k === 'users' ? 'User(s) Name' : 'Group(s) Name');

export function ShareDialog({ dashboard, onClose }: { dashboard: Dashboard | null; onClose: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [kind, setKind] = useState<ShareKind>('users');
  const [names, setNames] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [query, setQuery] = useState('');
  const [browse, setBrowse] = useState(false);

  // Every opening reloads the saved share, clears the search, closes the picker and re-ticks "Select All".
  useEffect(() => {
    if (!dashboard) return;
    const saved = dashStore.get().shares[dashboard.id];
    setKind(saved?.kind ?? 'users'); setNames(saved?.names ?? []); setSelectAll(true); setQuery(''); setBrowse(false);
  }, [dashboard]);

  if (!dashboard) return null;
  const q = query.trim().toLowerCase();
  const rows = PRINCIPALS[kind].filter((p) => names.includes(p.name) && (!q || p.name.toLowerCase().includes(q)));

  const done = () => {
    const saved = selectAll ? names : [];
    setShare(dashboard.id, { kind, names: saved }, user?.name ?? '');
    toast({ variant: 'success', title: 'Dashboard shared',
      message: saved.length ? `“${dashboard.name}” is shared with ${saved.join(', ')}.` : `“${dashboard.name}” is no longer shared.` });
    onClose();
  };

  if (browse) {
    return <PickerDialog kind={kind} names={names} onClose={() => setBrowse(false)}
      onDone={(k, ns) => { setKind(k); setNames(ns); setSelectAll(true); setBrowse(false); }} />;
  }
  return (
    <Modal open onClose={onClose} size="sm" icon="share" title="Shared With" subtitle={<>Dashboard: <b>{dashboard.name}</b></>}
      footer={<Button variant="primary" onClick={done}>Done</Button>}>
      <div className="dashboards-share__tools">
        <div className="stack stack--sm">
          <RadioGroup row ariaLabel="Share with" value={kind} options={KINDS} onChange={(v) => { setKind(v as ShareKind); setNames([]); }} />
          <Checkbox label="Select all" checked={selectAll} onChange={setSelectAll} />
        </div>
        <div className="row">
          <Button icon="users" onClick={() => setBrowse(true)}>Browse</Button>
          <SearchField value={query} onChange={setQuery} placeholder="Search" ariaLabel={kind === 'users' ? 'Search User(s)' : 'Search Group(s)'} />
        </div>
      </div>
      <PrincipalTable kind={kind}>
        {rows.length ? rows.map((p) => <tr key={p.name}><td>{p.name}</td><td>{p.domain}</td></tr>)
          : <tr><td>-</td><td>-</td></tr>}
      </PrincipalTable>
    </Modal>
  );
}

function PrincipalTable({ kind, children }: { kind: ShareKind; children: React.ReactNode }) {
  return (
    <div className="tbl-wrap dashboards-share__tbl">
      <table className="lf-table lf-table--auto">
        <thead><tr><th>{nameHead(kind)}</th><th>Domain Name</th></tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function PickerDialog({ kind: initialKind, names, onClose, onDone }: {
  kind: ShareKind; names: string[]; onClose: () => void; onDone: (k: ShareKind, names: string[]) => void;
}) {
  const [kind, setKind] = useState<ShareKind>(initialKind);
  const [picked, setPicked] = useState<string[]>(names);
  const list = PRINCIPALS[kind];
  const all = list.length > 0 && list.every((p) => picked.includes(p.name));
  return (
    <Modal open onClose={onClose} size="sm" icon="users" title="Select User(s) or Group(s)"
      footer={<Button variant="primary" disabled={picked.length === 0} onClick={() => onDone(kind, list.map((p) => p.name).filter((x) => picked.includes(x)))}>Done</Button>}>
      <div className="dashboards-share__tools">
        <RadioGroup row ariaLabel="Share with" value={kind} options={KINDS} onChange={(v) => { setKind(v as ShareKind); setPicked([]); }} />
        <Checkbox label="Select all" checked={all} indeterminate={picked.length > 0} onChange={(on) => setPicked(on ? list.map((p) => p.name) : [])} />
      </div>
      <PrincipalTable kind={kind}>
        {list.map((p) => (
          <tr key={p.name}>
            <td><Checkbox label={p.name} checked={picked.includes(p.name)}
              onChange={(on) => setPicked((xs) => (on ? [...xs, p.name] : xs.filter((x) => x !== p.name)))} /></td>
            <td>{p.domain}</td>
          </tr>
        ))}
      </PrincipalTable>
    </Modal>
  );
}
