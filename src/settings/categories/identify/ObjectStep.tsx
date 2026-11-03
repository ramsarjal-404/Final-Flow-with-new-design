import { useMemo, useState } from 'react';
import {
  Banner, Button, Checkbox, DataTable, EmptyState, IconButton, Menu, PasswordField, SelectField, TextField, useToast,
} from '../../../ui';
import { CONN_FIELDS, MAILBOXES_ONLINE, MAILBOXES_ONPREM, OD_ACCOUNTS, SP_SITES, newId, sameName } from './store';
import type { IdfSource, ObjKind, ObjectRow, Profile } from './store';
import { ImportCsvDialog, ImportDatasetDialog, SelectFoldersDialog, SingleValueDialog } from './ObjectDialogs';
import type { NewObject, SingleKind } from './ObjectDialogs';
import { SearchBox } from './shared';

/* Step "Profile Settings" of DLG-SDS-52 (heading "Profile Name & Object Selection"). */

type EnumCfg = { button: string; headers: string[]; items: NewObject[] };
export const ENUMERATED: Partial<Record<ObjKind, EnumCfg>> = {
  exchangeServer: { button: 'Enumerate Mailbox', headers: ['Mailbox Name'], items: MAILBOXES_ONPREM.map((n) => ({ path: n, server: '' })) },
  exchangeOnline: { button: 'Enumerate Mailboxes', headers: ['Mailbox Name', 'UserPrincipal Name'], items: MAILBOXES_ONLINE.map((m) => ({ path: m.name, upn: m.upn, server: '' })) },
  sharepointOnline: { button: 'Enumerate Site', headers: ['Site Collection Url'], items: SP_SITES.map((u) => ({ path: u, server: '' })) },
  onedrive: { button: 'Enumerate User Account', headers: ['User Accounts URL'], items: OD_ACCOUNTS.map((u) => ({ path: u, server: '' })) },
};

export type Errs = Record<string, string | undefined>;

/** Validation of the Profile Settings step, in order. */
export function validateSettings(source: IdfSource, d: Profile, profiles: Profile[]): [string, string][] {
  const out: [string, string][] = [];
  if (!d.name.trim()) out.push(['name', 'Enter the profile name.']);
  else if (profiles.some((p) => p.sourceId === source.id && p.id !== d.id && sameName(p.name, d.name)))
    out.push(['name', `A ${source.label} profile named "${d.name.trim()}" already exists.`]);
  for (const f of CONN_FIELDS[source.kind]) if (!(d.conn[f.id] ?? '').trim()) out.push(['conn.' + f.id, `Enter the ${f.label.toLowerCase()}.`]);
  if (d.objects.length === 0) {
    const e = ENUMERATED[source.kind];
    out.push(['objects', e ? `Enumerate and check at least one ${e.headers[0].toLowerCase()}.` : 'Add at least one object with Add From.']);
  }
  return out;
}

type MenuKind = SingleKind | 'dataset' | 'csv' | 'folders';

export function ProfileSettingsStep({ source, draft, patch, errors, enumerated, setEnumerated }: {
  source: IdfSource; draft: Profile; patch: (p: Partial<Profile>) => void; errors: Errs; enumerated: boolean; setEnumerated: (v: boolean) => void;
}) {
  const toast = useToast();
  const fields = CONN_FIELDS[source.kind];
  const en = ENUMERATED[source.kind];
  const [dlg, setDlg] = useState<MenuKind | null>(null);
  const [filter, setFilter] = useState('');

  const addObjects = (xs: NewObject[]) => {
    const seen = new Set(draft.objects.map((o) => o.path.toLowerCase()));
    const fresh: ObjectRow[] = [];
    for (const x of xs) {
      const k = x.path.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); fresh.push({ ...x, id: newId('o') });
    }
    setDlg(null);
    if (fresh.length === 0) { toast({ variant: 'info', title: 'Already added', message: 'Those objects are already in the list.' }); return; }
    patch({ objects: [...draft.objects, ...fresh] });
    toast({ variant: 'success', title: 'Objects added', message: `${fresh.length} object(s) added to ${draft.name.trim() || 'the profile'}.` });
  };

  const enumerate = () => {
    const miss = fields.find((f) => !(draft.conn[f.id] ?? '').trim());
    if (miss) { toast({ variant: 'error', title: 'Connection details missing', message: `Enter the ${miss.label.toLowerCase()} before enumerating.` }); return; }
    setEnumerated(true);
    toast({ variant: 'success', title: 'Enumeration complete', message: `${en!.items.length} records found.` });
  };

  const menu: { label: string; kind: MenuKind | 'all' }[] =
    source.kind === 'share' ? [
      { label: 'All Share', kind: 'server' }, { label: 'Import from Existing Dataset', kind: 'dataset' }, { label: 'Import from CSV', kind: 'csv' },
      { label: 'Set UNC Path', kind: 'unc' }, { label: 'Scan Share From Audited File Server', kind: 'folders' },
    ] : source.kind === 'sharepointServer' ? [{ label: 'Add manually', kind: 'site' }, { label: 'Import from CSV', kind: 'csv' }]
      : [{ label: 'Add manually', kind: 'folder' }, { label: 'All', kind: 'all' }, { label: 'Import from CSV', kind: 'csv' }];

  return (
    <>
      <h3 className="identify-step-h">Profile Name &amp; Object Selection</h3>
      <div className="fld-row">
        <TextField label="Profile Name" note="Required" value={draft.name} error={errors.name} maxLength={100} placeholder="Enter profile name"
          onChange={(v) => patch({ name: v })} />
        <TextField label="Description" value={draft.description} maxLength={200} placeholder="Enter description" onChange={(v) => patch({ description: v })} />
      </div>
      <div className="fld-row identify-conn">
        {fields.map((f) => {
          const v = draft.conn[f.id] ?? '';
          const set = (x: string) => patch({ conn: { ...draft.conn, [f.id]: x } });
          const err = errors['conn.' + f.id];
          if (f.type === 'select') return <SelectField key={f.id} label={f.label} placeholder="Select" options={f.options ?? []} value={v} error={err} onChange={set} />;
          if (f.type === 'password') return <PasswordField key={f.id} label={f.label} value={v} error={err} onChange={set} autoComplete="new-password" />;
          return <TextField key={f.id} label={f.label} help={f.hint} value={v} error={err} onChange={set} />;
        })}
      </div>

      {en ? (
        <EnumeratedList cfg={en} enumerated={enumerated} onEnumerate={enumerate} objects={draft.objects} error={errors.objects}
          filter={filter} setFilter={setFilter} onChange={(objs) => patch({ objects: objs })} />
      ) : (
        <div className="stack stack--sm">
          <DataTable flat title="Objects" noun={['object', 'objects']} rows={draft.objects} rowKey={(r) => r.id} defaultPageSize={10}
            toolbar={
              <Menu label="Add from" align="right" items={menu.map((m) => ({
                label: m.label,
                onSelect: () => (m.kind === 'all' ? addObjects([{ path: 'All', server: '' }]) : setDlg(m.kind)),
              }))}
                trigger={(p) => <Button icon="plus" iconEnd="chevron" {...p}>Add from</Button>} />
            }
            columns={[
              { key: 'path', header: source.kind === 'sharepointServer' ? 'Site Collection URL' : 'Folder Path', sortable: true },
              ...(source.kind === 'share' ? [{ key: 'server', header: 'Server', sortable: true }] : []),
            ]}
            rowActions={(r) => <IconButton icon="trash" label={`Remove ${r.path}`} className="identify-danger-ic"
              onClick={() => patch({ objects: draft.objects.filter((o) => o.id !== r.id) })} />}
            empty={<EmptyState compact icon="folder" title="No objects added. Use Add From to choose what to classify." />} />
          {errors.objects && <small className="fld__err" role="alert">{errors.objects}</small>}
        </div>
      )}

      <SingleValueDialog kind={dlg === 'server' || dlg === 'unc' || dlg === 'site' || dlg === 'folder' ? dlg : null} source={source} onClose={() => setDlg(null)} onAdd={addObjects} />
      <ImportDatasetDialog open={dlg === 'dataset'} onClose={() => setDlg(null)} onAdd={addObjects} />
      <ImportCsvDialog open={dlg === 'csv'} urlMode={source.kind === 'sharepointServer'} onClose={() => setDlg(null)} onAdd={addObjects} />
      <SelectFoldersDialog open={dlg === 'folders'} onClose={() => setDlg(null)} onAdd={addObjects} />
    </>
  );
}

function EnumeratedList({ cfg, enumerated, onEnumerate, objects, onChange, error, filter, setFilter }: {
  cfg: EnumCfg; enumerated: boolean; onEnumerate: () => void; objects: ObjectRow[]; onChange: (o: ObjectRow[]) => void;
  error?: string; filter: string; setFilter: (v: string) => void;
}) {
  const total = cfg.items.length;
  const checked = useMemo(() => new Set(objects.map((o) => o.path)), [objects]);
  const q = filter.trim().toLowerCase();
  const shown = cfg.items.filter((i) => !q || i.path.toLowerCase().includes(q) || (i.upn ?? '').toLowerCase().includes(q));
  const allShown = shown.length > 0 && shown.every((i) => checked.has(i.path));
  const someShown = shown.some((i) => checked.has(i.path));
  const build = (paths: Set<string>) => cfg.items.filter((i) => paths.has(i.path)).map((i) => ({ ...i, id: 'en-' + i.path }));
  const toggle = (p: string) => { const s = new Set(checked); if (s.has(p)) s.delete(p); else s.add(p); onChange(build(s)); };
  const k = objects.length;
  return (
    <section className="lf-card tablecard tablecard--flat">
      <div className="toolbar">
        <h3 className="lf-card__title" style={{ margin: 0 }}>{cfg.headers[0]}</h3>
        <div className="row row--wrap">
          {enumerated && <SearchBox value={filter} onChange={setFilter} ariaLabel="Filter records" placeholder="Filter" maxLength={100} />}
          <Button icon="refresh" onClick={onEnumerate}>{cfg.button}</Button>
        </div>
      </div>
      {!enumerated ? (
        <EmptyState compact icon="refresh" title={`Enter the connection details and click ${cfg.button} to list the objects.`} />
      ) : (
        <>
          {k > 0 && k < total && (
            <div style={{ padding: '0 20px 12px' }}><Banner tone="info">
              <button type="button" className="lf-link identify-linkbtn" onClick={() => onChange(build(new Set(cfg.items.map((i) => i.path))))}>Do you want to select all {total} records?</button>
            </Banner></div>
          )}
          {k === total && (
            <div style={{ padding: '0 20px 12px' }}><Banner tone="info">
              All {total} records are selected. <button type="button" className="lf-link identify-linkbtn" onClick={() => onChange([])}>Clear selection</button>
            </Banner></div>
          )}
          <div className="tbl-wrap" style={{ maxHeight: 360 }}>
            <table className="lf-table">
              <thead><tr>
                <th className="th-check"><Checkbox checked={allShown} indeterminate={someShown && !allShown} ariaLabel="Select all visible records"
                  onChange={() => {
                    const s = new Set(checked);
                    shown.forEach((i) => (allShown ? s.delete(i.path) : s.add(i.path)));
                    onChange(build(s));
                  }} /></th>
                {cfg.headers.map((h) => <th key={h}>{h}</th>)}
              </tr></thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr><td colSpan={cfg.headers.length + 1} className="empty-cell" style={{ maxWidth: 'none', position: 'static' }}>No results match your search or filters.</td></tr>
                ) : shown.map((i) => {
                  const on = checked.has(i.path);
                  return (
                    <tr key={i.path} className={'lf-row' + (on ? ' is-sel' : '')}
                      onClick={(e) => { if ((e.target as Element).closest('label,input')) return; toggle(i.path); }}>
                      <td className="td-check"><Checkbox checked={on} ariaLabel={`Select ${i.path}`} onChange={() => toggle(i.path)} /></td>
                      <td title={i.path}>{i.path}</td>
                      {cfg.headers.length > 1 && <td title={i.upn}>{i.upn}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pager"><span className="total">Total Record(s) - {total} · Selected - {k}</span></div>
        </>
      )}
      {error && <small className="fld__err identify-pad-err" role="alert">{error}</small>}
    </section>
  );
}
