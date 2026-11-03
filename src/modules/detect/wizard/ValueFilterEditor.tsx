import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Checkbox, Drawer, Field, Icon, IconButton, SelectField, onMenuKeys, useDismiss, useToast } from '../../../ui';
import { BACKUP_OBJECTS, BACKUP_SERVERS, OPERATION_OPTIONS, REASON_OPTIONS, VALUE_FILTER_FIELDS, VALUE_FILTER_INCLUDES, type ValueFilter } from '../model';
import { ClearableSearch } from '../parts';

/* Value-list filter editor (ENT-DET-ValueFilter) with the DLG-DET-10 popovers and DLG-DET-11 Explore Backup. */

type PopKind = null | 'menu' | 'manual' | 'pick';

/** Adds values as applied, de-duplicated case-insensitively; returns how many were new. */
function addValues(vf: ValueFilter, incoming: string[]): [ValueFilter, number] {
  const seen = new Set(vf.values.map((v) => v.value.toLowerCase()));
  const add: { value: string; checked: boolean }[] = [];
  incoming.map((s) => s.trim()).filter(Boolean).forEach((s) => {
    if (seen.has(s.toLowerCase())) return;
    seen.add(s.toLowerCase()); add.push({ value: s, checked: true });
  });
  return [{ ...vf, values: [...vf.values, ...add] }, add.length];
}
const splitSemi = (t: string) => t.split(';').map((s) => s.trim()).filter(Boolean);

function PopHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="detect-pop__head">
      <b>{title}</b>
      <button type="button" className="lf-btn lf-btn--icon" style={{ width: 28, height: 28 }} aria-label="Close" onClick={onClose}><Icon name="x" size={14} /></button>
    </div>
  );
}

export function ValueFilterEditor({ vf, onChange }: { vf: ValueFilter; onChange: (v: ValueFilter) => void }) {
  const toast = useToast();
  const [pop, setPop] = useState<PopKind>(null);
  const [backup, setBackup] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const refs = useMemo(() => [wrap], []);
  const close = useMemo(() => () => setPop(null), []);
  useDismiss(pop !== null, close, refs);
  const file = useRef<HTMLInputElement>(null);
  const field = vf.field;
  const lower = field.toLowerCase();
  const all = vf.include === 'All';
  const anyTicked = vf.values.some((v) => v.checked);
  const isPick = field === 'Reason' || field === 'Operation';

  const onCsv = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      const [next, n] = addValues(vf, String(r.result ?? '').split(/[\r\n,;]+/));
      onChange(next);
      toast(n ? { variant: 'success', title: 'Add CSV', message: `${n} value(s) added from ${f.name}.` }
        : { variant: 'info', title: 'Add CSV', message: `No new values in ${f.name}.` });
    };
    r.readAsText(f);
  };

  let body: ReactNode;
  if (all) body = <p className="detect-hint">All {lower} values are included. Change <b>Include</b> to pick values.</p>;
  else if (!vf.values.length) body = <p className="detect-hint">No values yet. Click <b>+</b> to add {lower} values.</p>;
  else body = (
    <ul className="detect-values">
      {vf.values.map((v) => (
        <li key={v.value}>
          <Checkbox checked={v.checked} label={v.value}
            onChange={(c) => onChange({ ...vf, values: vf.values.map((x) => (x.value === v.value ? { ...x, checked: c } : x)) })} />
          <IconButton icon="trash" danger label={`Remove ${v.value}`} size={14}
            onClick={() => onChange({ ...vf, values: vf.values.filter((x) => x.value !== v.value) })} />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="detect-box">
      <div className="detect-vf-bar">
        <SelectField aria-label="Filter field" options={VALUE_FILTER_FIELDS} value={field}
          onChange={(v) => onChange({ field: v, include: 'All', values: [] })} />
        <span className="detect-vf-inc">
          <label htmlFor="detect-vf-include" className="fld__lbl">Include</label>
          <SelectField id="detect-vf-include" options={VALUE_FILTER_INCLUDES} value={vf.include} onChange={(v) => onChange({ ...vf, include: v })} />
        </span>
        <span className="rel" ref={wrap} style={{ display: 'inline-flex' }}>
          <IconButton icon="plus" bordered label={`Add ${field} values`} disabled={all} aria-haspopup={isPick ? 'dialog' : 'menu'} aria-expanded={pop !== null}
            onClick={() => setPop(pop ? null : isPick ? 'pick' : 'menu')} />
          {pop === 'menu' && (
            <div className="pop detect-pop" role="menu" aria-label={`Add ${field}`} onKeyDown={onMenuKeys}>
              <PopHead title={field} onClose={close} />
              <button type="button" role="menuitem" className="pop__item" autoFocus onClick={() => setPop('manual')}><Icon name="edit" size={15} /><span>Add manually</span></button>
              <button type="button" role="menuitem" className="pop__item" onClick={() => { setPop(null); file.current?.click(); }}><Icon name="upload" size={15} /><span>Add CSV</span></button>
              <button type="button" role="menuitem" className="pop__item" onClick={() => { setPop(null); setBackup(true); }}><Icon name="archive" size={15} /><span>Import From Backup</span></button>
            </div>
          )}
          {pop === 'manual' && <ManualPanel field={field} onClose={close} onDone={(vals) => { onChange(addValues(vf, vals)[0]); close(); }} />}
          {pop === 'pick' && <PickPanel field={field} options={field === 'Reason' ? REASON_OPTIONS : OPERATION_OPTIONS} current={vf.values.map((v) => v.value)}
            onClose={close} onDone={(picked) => {
              onChange({ ...vf, values: picked.map((p) => vf.values.find((v) => v.value === p) ?? { value: p, checked: true }) });
              close();
            }} />}
        </span>
        <IconButton icon="trash" danger bordered label="Remove ticked values" disabled={!anyTicked}
          onClick={() => onChange({ ...vf, values: vf.values.filter((v) => !v.checked) })} />
        <input ref={file} type="file" accept=".csv,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsv(f); e.target.value = ''; }} />
      </div>
      <h5 className="detect-vf-title">{field}</h5>
      {body}
      <ExploreBackup open={backup} field={field} onClose={() => setBackup(false)} onDone={(paths) => {
        const [next, n] = addValues(vf, paths);
        onChange(next);
        setBackup(false);
        // GAP-DET-06 intended: an info "No new values" variant when every pick already existed.
        toast(n ? { variant: 'success', title: 'Import from backup', message: `${n} value(s) imported.` }
          : { variant: 'info', title: 'Import from backup', message: 'No new values were imported.' });
      }} />
    </div>
  );
}

/* ---- "Add manually" panel ---- */
function ManualPanel({ field, onClose, onDone }: { field: string; onClose: () => void; onDone: (values: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const [chips, setChips] = useState<string[]>([]);
  const push = () => {
    const parts = splitSemi(draft);
    if (!parts.length) return;
    setChips((c) => { const out = [...c]; parts.forEach((p) => { if (!out.includes(p)) out.push(p); }); return out; });
    setDraft('');
  };
  const canDone = chips.length > 0 || draft.trim() !== '';
  return (
    <div className="pop detect-pop detect-pop--panel" role="dialog" aria-label={`Add ${field} manually`}>
      <PopHead title={field} onClose={onClose} />
      <div className="detect-pop__body">
        <span className="lf-input lf-input--pill">
          <input autoFocus value={draft} placeholder="Please enter" aria-label={`${field} value`} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); push(); } }} />
          <button type="button" className="detect-search__x" aria-label="Add value" onClick={push}><Icon name="plus" size={14} /></button>
        </span>
        {chips.length ? (
          <ul className="detect-chips">
            {chips.map((c) => (
              <li key={c} className="lf-chip lf-chip--brand"><span>{c}</span>
                <button type="button" aria-label={`Remove ${c}`} onClick={() => setChips((x) => x.filter((y) => y !== c))}><Icon name="x" size={12} /></button>
              </li>
            ))}
          </ul>
        ) : <p className="detect-hint">Type a value and press Enter or +. Separate several with ";".</p>}
      </div>
      <div className="detect-pop__foot">
        <Button size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" disabled={!canDone} onClick={() => onDone([...chips, ...splitSemi(draft)])}>Done</Button>
      </div>
    </div>
  );
}

/* ---- pick panel (Reason / Operation) ---- */
function PickPanel({ field, options, current, onClose, onDone }: { field: string; options: string[]; current: string[]; onClose: () => void; onDone: (picked: string[]) => void }) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>(() => options.filter((o) => current.includes(o)));
  const shown = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="pop detect-pop detect-pop--panel" role="dialog" aria-label={`Select ${field}`}>
      <PopHead title={field} onClose={onClose} />
      <div className="detect-pop__body">
        <ClearableSearch value={q} onChange={setQ} placeholder="Please enter" ariaLabel={`Search ${field}`} autoFocus />
        <div className="detect-pop__list" role="group" aria-label={field}>
          {shown.map((o) => (
            <Checkbox key={o} label={o} checked={picked.includes(o)}
              onChange={(c) => setPicked((p) => (c ? options.filter((x) => p.includes(x) || x === o) : p.filter((x) => x !== o)))} />
          ))}
        </div>
      </div>
      <div className="detect-pop__foot">
        <Button size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" onClick={() => onDone(picked)}>Done</Button>
      </div>
    </div>
  );
}

/* ---------------- DLG-DET-11 · Explore Backup ---------------- */
function ExploreBackup({ open, field, onClose, onDone }: { open: boolean; field: string; onClose: () => void; onDone: (paths: string[]) => void }) {
  const [server, setServer] = useState('');
  const [date, setDate] = useState('');
  const [generated, setGenerated] = useState(false);
  const [qPath, setQPath] = useState('');
  const [qCls, setQCls] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => { if (open) { setServer(''); setDate(''); setGenerated(false); setQPath(''); setQCls(''); setPicked([]); } }, [open]);
  const reset = () => { setGenerated(false); setPicked([]); setQPath(''); setQCls(''); };
  const rows = BACKUP_OBJECTS.filter((o) => o.path.toLowerCase().includes(qPath.trim().toLowerCase()) && o.cls.toLowerCase().includes(qCls.trim().toLowerCase()));
  return (
    <Drawer open={open} onClose={onClose} title="Explore backup" width={620}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!picked.length} onClick={() => onDone(picked)}>Done</Button></>}>
      <div className="page-form stack">
        <SelectField label="Select server" placeholder="Select" options={BACKUP_SERVERS} value={server} onChange={(v) => { setServer(v); reset(); }} />
        <div className="detect-inline-field">
          <Field label="Select backup" htmlFor="detect-backup-date">
            <input id="detect-backup-date" type="date" aria-label="Backup date" value={date} onChange={(e) => { setDate(e.target.value); reset(); }} />
          </Field>
          <Button icon="refresh" disabled={!server || !date} onClick={() => setGenerated(true)}>Generate</Button>
        </div>
        <section className="lf-card tablecard tablecard--flat">
          <div className="tbl-wrap">
            <table className="lf-table" aria-label={`${field} objects in backup`}>
              <thead>
                <tr><th>Object Path/Name</th><th style={{ width: 170 }}>Object Class</th></tr>
                <tr className="filter-row">
                  <th><ClearableSearch value={qPath} onChange={setQPath} placeholder="Search for object path/name" ariaLabel="Search for object path/name" disabled={!generated} /></th>
                  <th><ClearableSearch value={qCls} onChange={setQCls} placeholder="Search for object class" ariaLabel="Search for object class" disabled={!generated} /></th>
                </tr>
              </thead>
              <tbody>
                {!generated ? (
                  <tr><td colSpan={2} className="tbl-empty">Select a server and a backup date, then click Generate.</td></tr>
                ) : rows.length ? rows.map((o) => (
                  <tr key={o.path} className="lf-row" style={{ cursor: 'default' }}>
                    <td><Checkbox checked={picked.includes(o.path)} label={o.path}
                      onChange={(c) => setPicked((p) => (c ? [...p, o.path] : p.filter((x) => x !== o.path)))} /></td>
                    <td>{o.cls}</td>
                  </tr>
                )) : <tr><td colSpan={2} className="tbl-empty">No objects match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Drawer>
  );
}
