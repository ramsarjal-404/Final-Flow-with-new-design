import { useMemo, useState } from 'react';
import {
  Avatar, Button, Checkbox, ConfirmDialog, Field, Icon, IconButton, Modal, RadioGroup, SearchField, SearchSelect, TextAreaField, TextField, useToast,
} from '../ui';
import { adminStore, directoryFor } from '../stores/admin';
import { flattenReports, folderNameTaken, reportActions } from './store';
import type { CatalogFolder, CatalogReportNode, ModuleKey, ReportDraft, ReportRow, SharedMember } from './types';

/* DLG-RLIB-01, 02, 09, 10, 11. Copy from modules/report-library/screens.md. */

export const INVALID_CHARS = /[*:"|<>/\\?]/;
const CHARS = '* : " | < > / \\ ?';

/* ---------------- DLG-RLIB-01 · Create Report ---------------- */

/** Folder List options: predefined folders with ≥ 1 enabled report (groups flattened) + every custom folder. */
export function eligibleFolders(folders: CatalogFolder[]) {
  return folders.filter((f) => f.custom || flattenReports(f.children).some((n) => !n.disabled));
}
/** Predefined Reports options for a folder (custom folder: every enabled predefined report). */
export function reportsForFolder(folders: CatalogFolder[], folderId: string): CatalogReportNode[] {
  const f = folders.find((x) => x.id === folderId);
  if (!f) return [];
  const src = f.custom ? folders.filter((x) => !x.custom).flatMap((x) => flattenReports(x.children)) : flattenReports(f.children);
  const seen = new Set<string>();
  return src.filter((n) => !n.disabled && !seen.has(n.slug) && seen.add(n.slug) !== undefined);
}

export function CreateReportDialog({ open, onClose, folders, onNext }: {
  open: boolean; onClose: () => void; folders: CatalogFolder[]; onNext: (d: ReportDraft) => void;
}) {
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState('');
  const [reportId, setReportId] = useState('');
  const [desc, setDesc] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const reset = () => { setName(''); setFolderId(''); setReportId(''); setDesc(''); setErr({}); };
  const close = () => { reset(); onClose(); };
  const fOpts = useMemo(() => eligibleFolders(folders).map((f) => ({ value: f.id, label: f.name })), [folders]);
  const rNodes = useMemo(() => reportsForFolder(folders, folderId), [folders, folderId]);
  const chosen = rNodes.find((n) => n.slug === reportId);
  const baseFolder = chosen && folders.find((f) => !f.custom && flattenReports(f.children).some((n) => n.slug === chosen.slug));
  const clear = (k: string) => setErr((e) => { const n = { ...e }; delete n[k]; return n; });

  const next = () => {
    const e: Record<string, string> = {};
    const n = name.trim();
    if (!n) e.name = 'Please type report name.';
    else if (INVALID_CHARS.test(n)) e.name = `Report name cannot contain following characters: ${CHARS}`;
    if (!folderId) e.folder = 'Please select folder name.';
    if (!reportId) e.report = 'Please select predefined report.';
    if (!desc.trim()) e.desc = 'Please type report description.';
    setErr(e);
    if (Object.keys(e).length) return;
    const draft = { name: n, folderId, predefinedReportId: reportId, description: desc.trim() };
    reset(); onNext(draft);
  };

  return (
    <Modal open={open} onClose={close} title="Create report" icon="plus" size="sm" steps={['Details', 'Columns & filters']} step={0}
      footerHint="Step 1 of 2"
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" iconEnd="arrow" onClick={next}>Next</Button></>}>
      <TextField label="Report Name :" placeholder="Type here report name" maxLength={200} value={name} error={err.name}
        onChange={(v) => { setName(v); clear('name'); }} />
      <div className="fld-row">
        <SearchSelect label="Folder List :" placeholder="Select Folder" options={fOpts} value={folderId} error={err.folder} searchFrom={0}
          onChange={(v) => { setFolderId(v); setReportId(''); clear('folder'); }} />
        <SearchSelect label="Predefined Reports:" placeholder="Select Reports" options={rNodes.map((x) => ({ value: x.slug, label: x.name }))}
          value={reportId} error={err.report} disabled={!folderId} searchFrom={0} onChange={(v) => { setReportId(v); clear('report'); }} />
      </div>
      {chosen && (
        <div className="basecard">
          <span className="basecard__ic"><Icon name="file" size={15} /></span>
          <div className="basecard__text"><b>{chosen.name}</b>{chosen.description && <span>{chosen.description}</span>}</div>
          {baseFolder && <span className="lf-chip lf-chip--brand">{baseFolder.name}</span>}
        </div>
      )}
      <TextAreaField label="Description :" placeholder="Type here report description" rows={5} value={desc} error={err.desc}
        onChange={(v) => { setDesc(v); clear('desc'); }} />
    </Modal>
  );
}

/* ---------------- DLG-RLIB-02 · Create Folder ---------------- */

export function CreateFolderDialog({ open, onClose, moduleKey, onCreated }: {
  open: boolean; onClose: () => void; moduleKey: ModuleKey; onCreated: (f: CatalogFolder) => void;
}) {
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const close = () => { setName(''); setErr(null); onClose(); };
  const submit = () => {
    const n = name.trim();
    if (!n) return setErr('Please type folder name.');
    if (INVALID_CHARS.test(n)) return setErr(`Folder name cannot contain following characters: ${CHARS}`);
    if (folderNameTaken(moduleKey, n)) return setErr('A folder with this name already exists.');
    const f = reportActions.createFolder(moduleKey, n);
    setName(''); setErr(null); onCreated(f);
  };
  return (
    <Modal open={open} onClose={close} title="Create folder" icon="folder" size="xs"
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={submit}>Submit</Button></>}>
      <TextField label="Folder Name :" placeholder="Type here folder name" maxLength={200} value={name} error={err} autoFocus
        onChange={(v) => { setName(v); setErr(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />
    </Modal>
  );
}

/* ---------------- shared member list (DLG-RLIB-09 / 10) ---------------- */

function MemberList({ members, checked, onChecked, query, onRemove }: {
  members: SharedMember[]; checked: string[]; onChecked: (ids: string[]) => void; query: string; onRemove?: (m: SharedMember) => void;
}) {
  const shown = members.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));
  const all = shown.length > 0 && shown.every((m) => checked.includes(m.id));
  const some = shown.some((m) => checked.includes(m.id));
  return (
    <div className="rlib-members" role="group" aria-label="Members">
      <div className="rlib-members__head">
        <Checkbox checked={all} indeterminate={some && !all} ariaLabel="Select all"
          onChange={() => onChecked(all ? checked.filter((id) => !shown.some((m) => m.id === id)) : Array.from(new Set([...checked, ...shown.map((m) => m.id)])))} />
        <span>Name</span><span>Domain Name</span>{onRemove && <span className="sr-only">Remove</span>}
      </div>
      <div className="rlib-members__list">
        {shown.length ? shown.map((m) => (
          <label key={m.id} className="rlib-members__row">
            <Checkbox checked={checked.includes(m.id)} ariaLabel={`Select ${m.name}`}
              onChange={() => onChecked(checked.includes(m.id) ? checked.filter((x) => x !== m.id) : [...checked, m.id])} />
            <span className="fx-who"><Avatar name={m.name} size={26} /><span className="fx-name">{m.name}</span></span>
            <span className="lf-muted">{m.domain || '—'}</span>
            {onRemove && <IconButton icon="trash" label={`Remove ${m.name}`} danger onClick={(e) => { e.preventDefault(); onRemove(m); }} />}
          </label>
        )) : <p className="rlib-members__empty">No results match your search or filters.</p>}
      </div>
    </div>
  );
}

/* ---------------- DLG-RLIB-09 · Share report ---------------- */

export function ShareDialog({ row, moduleKey, sharer, onClose }: { row: ReportRow | null; moduleKey: ModuleKey; sharer: string; onClose: () => void }) {
  const [type, setType] = useState<'Groups' | 'Users'>('Groups');
  const [list, setList] = useState<SharedMember[] | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [done, setDone] = useState(false);
  const reset = () => { setType('Groups'); setList(null); setChecked([]); setQ(''); setDone(false); };
  const close = () => { reset(); onClose(); };
  const domain = adminStore.get().domains[0]?.domain ?? 'lpde4.local';
  const browse = () => {
    setList(directoryFor(domain, type === 'Groups' ? 'Group' : 'User').map((d) => ({ id: d.id, name: d.name, type: d.type, domain })));
    setChecked([]);
  };
  const share = () => {
    if (!row || !list) return;
    reportActions.share(moduleKey, row.id, list.filter((m) => checked.includes(m.id)), sharer);
    setDone(true);
  };
  return (
    <>
      <Modal open={!!row && !done} onClose={close} title="Select User(s) or Group(s)" subtitle={row?.name} icon="share" size="sm"
        footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!checked.length} onClick={share}>Done</Button></>}>
        <Field label="Share with">
          <div className="row row--wrap" style={{ gap: 12 }}>
            <RadioGroup row value={type} onChange={(v) => { setType(v as 'Groups' | 'Users'); setList(null); setChecked([]); }} options={['Groups', 'Users']} ariaLabel="Member type" />
            <Button size="sm" icon="search" onClick={browse}>Browse</Button>
          </div>
        </Field>
        {list ? (
          <>
            <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search members" />
            <MemberList members={list} checked={checked} onChecked={setChecked} query={q} />
          </>
        ) : <p className="pane__hint">Choose Groups or Users, then select Browse to list the directory of {domain}.</p>}
      </Modal>
      <Modal open={!!row && done} onClose={close} title="Successfully Shared" subtitle={row?.name} icon="check" size="xs"
        footer={<Button variant="primary" onClick={close}>Done</Button>} />
    </>
  );
}

/* ---------------- DLG-RLIB-10 · Shared With ---------------- */

export function SharedWithDialog({ row, moduleKey, onClose }: { row: ReportRow | null; moduleKey: ModuleKey; onClose: () => void }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState<{ ids: string[]; message: string } | null>(null);
  const members: SharedMember[] = row ? (row.sharedMembers ?? row.sharedWith.map((n) => ({ id: n, name: n, type: 'User' as const, domain: '' }))) : [];
  const close = () => { setChecked([]); setQ(''); setConfirm(null); onClose(); };
  return (
    <>
      <Modal open={!!row && !confirm} onClose={close} title="Shared With" subtitle={row?.name} icon="users" size="xs"
        footer={<><Button onClick={close}>Cancel</Button><Button variant="danger-solid" disabled={!checked.length}
          onClick={() => setConfirm({ ids: checked, message: "You won't be able to revert this action." })}>Remove</Button></>}>
        <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search members" />
        <MemberList members={members} checked={checked} onChecked={setChecked} query={q}
          onRemove={(m) => setConfirm({ ids: [m.id], message: `Are you sure you want to remove this ${m.type === 'Group' ? 'group' : 'user'}?` })} />
      </Modal>
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} title="Are you sure?" message={confirm?.message} confirmLabel="Remove"
        onConfirm={() => {
          if (row && confirm) reportActions.unshare(moduleKey, row.id, confirm.ids);
          const left = members.length - (confirm?.ids.length ?? 0);
          setChecked((c) => c.filter((id) => !confirm?.ids.includes(id))); setConfirm(null);
          if (left <= 0) close();
        }} />
    </>
  );
}

/* ---------------- DLG-RLIB-11 · Move report ---------------- */

export function MoveReportDialog({ row, moduleKey, folders, onClose }: { row: ReportRow | null; moduleKey: ModuleKey; folders: CatalogFolder[]; onClose: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [pick, setPick] = useState('');
  const close = () => { setQ(''); setPick(''); onClose(); };
  const opts = folders.filter((f) => f.id !== row?.folderId && f.name.toLowerCase().includes(q.trim().toLowerCase()))
    .map((f) => ({ value: f.id, label: f.name + (f.custom ? ' (custom)' : '') }));
  const done = () => {
    if (!row) return;
    if (!pick) { toast({ variant: 'error', title: 'Move Report', message: 'Please select any folder to move further.' }); return; }
    reportActions.moveReport(moduleKey, row.id, pick);
    toast({ variant: 'success', title: 'Move Report', message: `"${row.name}" was moved to ${folders.find((f) => f.id === pick)?.name ?? 'the folder'}.` });
    close();
  };
  return (
    <Modal open={!!row} onClose={close} title="Select a Folder" subtitle={row?.name} icon="folder" size="xs"
      footer={<><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <Field label="Folder List">
        <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search folders" />
      </Field>
      <div className="rlib-move-list">
        {opts.length ? <RadioGroup value={pick} onChange={setPick} options={opts} ariaLabel="Folder List" />
          : <p className="rlib-members__empty">No results match your search or filters.</p>}
      </div>
    </Modal>
  );
}
