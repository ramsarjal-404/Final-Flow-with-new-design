import { useState } from 'react';
import {
  Button, ConfirmDialog, DataTable, DetailPanel, EmptyState, IconButton, KeyValues, SearchSelect, Segmented, SetCard, ToneTag, useToast,
} from '../../../ui';
import type { StatusTone } from '../../../ui';
import { uid } from '../../../stores/createStore';
import { SqlBlock, SubHeader, sqlErrors, testConnection } from './shared';
import type { SqlErrors } from './shared';
import { DatabaseSettingsDialog, EnumerateSqlDialog, FindSharesDialog } from './DbDialogs';
import { DataSetWizard } from './DataSetWizard';
import {
  DATABASES, STALE_OPTIONS, patchSource, plural, runScan, scanType, scheduleSummary, useSourceState,
} from './store';
import type { DataSet, DataSetStatus, SecondaryDb, SqlValue, TrustSource } from './store';

/* SCR-SDS-10 · Current Permission Scan Settings - <source> (tabs Data Set · Primary Database · Secondary Database(s)) */

const STATUS_TONE: Record<DataSetStatus, StatusTone> = { Successful: 'good', Scheduled: 'info', Running: 'warn', 'Not Scanned': 'none' };

export function SourcePage({ source }: { source: TrustSource }) {
  const toast = useToast();
  const [tab, setTab] = useState('data');
  const [selected, setSelected] = useState<string | null>(null);
  const [wizard, setWizard] = useState<{ editing?: DataSet } | null>(null);

  if (wizard) {
    return (
      <div className="trust-root">
        <DataSetWizard source={source} editing={wizard.editing} onClose={() => setWizard(null)}
          onSave={(ds, { created }) => {
            patchSource(source.id, (s) => ({ ...s, dataSets: created ? [...s.dataSets, ds] : s.dataSets.map((x) => (x.id === ds.id ? ds : x)) }));
            toast({ variant: 'success', title: created ? 'Data set created' : 'Data set updated',
              message: ds.scanNow ? `${ds.name} was saved and scanned.` : `${ds.name} was saved — ${scanType(ds).toLowerCase()}.` });
            // GAP-SDS-17 intended: "Scan Now" runs the scan (Running → Successful) instead of marking it Successful at once.
            if (ds.scanNow) runScan(source.id, ds.id, toast, false);
            setSelected(ds.id);
            setWizard(null);
          }} />
      </div>
    );
  }

  return (
    <div className="stack trust-root">
      <SubHeader logo={source.logo} crumbs={[{ label: 'Trust Settings', to: '/settings/trust' }, { label: source.label }]}
        title={`Current Permission Scan Settings - ${source.label}`} subtitle="Add Current Permission Scan Settings Credentials" />
      <div className="trust-tabs">
        <Segmented ariaLabel="Scan settings" value={tab} onChange={setTab}
          items={[{ value: 'data', label: 'Data Set' }, { value: 'primary', label: 'Primary Database' }, { value: 'secondary', label: 'Secondary Database(s)' }]} />
      </div>
      {tab === 'data' && <DataSetTab source={source} selected={selected} onSelect={setSelected} onAdd={() => setWizard({})} onEdit={(ds) => setWizard({ editing: ds })} />}
      {tab === 'primary' && <PrimaryTab source={source} />}
      {tab === 'secondary' && <SecondaryTab source={source} />}
    </div>
  );
}

/* ---------------- Data Set tab ---------------- */
function DataSetTab({ source, selected, onSelect, onAdd, onEdit }: {
  source: TrustSource; selected: string | null; onSelect: (id: string | null) => void; onAdd: () => void; onEdit: (ds: DataSet) => void;
}) {
  const toast = useToast();
  const st = useSourceState(source.id);
  const [find, setFind] = useState(false);
  const [del, setDel] = useState<DataSet | null>(null);
  const nas = source.kind === 'nas';
  const sel = st.dataSets.find((d) => d.id === selected) ?? null;

  const info = (d: DataSet) => {
    const items = [
      { label: 'Data Set Name', value: d.name, wide: true },
      { label: 'Description', value: d.description || '—', wide: true },
      { label: 'Component', value: source.label },
      nas
        ? { label: 'Folders', value: <ul className="trust-list">{d.folders.map((f) => <li key={f.id}>{f.folder} ({f.server})</li>)}</ul>, wide: true }
        : { label: 'Objects', value: d.objects.length ? <ul className="trust-list">{d.objects.map((o) => <li key={o}>{o}</li>)}</ul> : (d.config.server || d.config.tenant || '—'), wide: true },
      ...(nas ? [{ label: 'Database Mapping', value: <ul className="trust-list">{d.mappings.map((m) => <li key={m.server}>{m.server} → {m.sqlServer} / {m.database}</li>)}</ul>, wide: true }] : []),
      { label: 'Schedule', value: d.schedule ? scheduleSummary(d.schedule) : 'Scan Once Only', wide: true },
      { label: 'Agent', value: d.agent },
      { label: 'Last Scan', value: d.lastScan },
      { label: 'Status', value: <ToneTag tone={STATUS_TONE[d.status]}>{d.status}</ToneTag> },
    ];
    return <KeyValues items={items} />;
  };

  const table = (
    <DataTable<DataSet>
      title="Data Set" noun={['data set', 'data sets']} rows={st.dataSets} rowKey={(r) => r.id} pageSizes={[10, 25, 50, 100]}
      activeKey={selected} onRowOpen={(r) => onSelect(r.id)}
      toolbar={<>
        <div className="row trust-stale">
          <span className="text-sm">Stale object settings</span>
          <SearchSelect pill ariaLabel="Stale object settings" options={STALE_OPTIONS} value={st.stale} onChange={(v) => {
            patchSource(source.id, (s) => ({ ...s, stale: v }));
            toast({ variant: 'success', title: 'Stale object settings saved', message: `Objects untouched for ${v.toLowerCase()} are reported as stale.` });
          }} />
        </div>
        <Button icon="search" onClick={() => setFind(true)}>Find all shares</Button>
        <Button variant="primary" icon="plus" onClick={onAdd}>Add Data set</Button>
      </>}
      empty={<EmptyState icon="folder" title="No Data set detected." message="Please create a Data set to proceed with current permission scan settings" />}
      columns={[
        { key: 'name', header: 'Data Set Name', sortable: true, filterable: true, minWidth: 180 },
        { key: 'agent', header: 'Agent', sortable: true, filterable: true },
        { key: 'lastScan', header: 'Last Scan', sortable: true, filterable: true, minWidth: 170 },
        { key: 'nextScan', header: 'Next Scan', sortable: true, filterable: true, minWidth: 170 },
        { key: 'status', header: 'Status', sortable: true, filterable: true, render: (r) => <ToneTag tone={STATUS_TONE[r.status]}>{r.status}</ToneTag> },
        { key: 'scanType', header: 'Scan Type', sortable: true, filterable: true, value: scanType },
      ]}
      rowActions={(r) => <>
        <IconButton icon="play" label={`Run scan for ${r.name}`} disabled={r.status === 'Running'} onClick={() => runScan(source.id, r.id, toast)} />
        <IconButton icon="trash" danger label={`Delete ${r.name}`} onClick={() => setDel(r)} />
        <IconButton icon="edit" label={`Edit ${r.name}`} onClick={() => onEdit(r)} />
      </>}
    />
  );

  return (
    <>
      {sel ? (
        <div className="with-detail">
          {table}
          <DetailPanel title="Data Set Information" subtitle={sel.name} onClose={() => onSelect(null)}>{info(sel)}</DetailPanel>
        </div>
      ) : table}
      {find && <FindSharesDialog open onClose={() => setFind(false)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete data set" confirmLabel="Delete"
        message={del ? `Delete "${del.name}"? Its permission scan schedule is removed. This can't be undone.` : ''}
        onConfirm={() => {
          if (!del) return;
          patchSource(source.id, (s) => ({ ...s, dataSets: s.dataSets.filter((d) => d.id !== del.id) }));
          if (selected === del.id) onSelect(null);
          toast({ variant: 'success', title: 'Data set deleted', message: `${del.name} was removed.` });
          setDel(null);
        }} />
    </>
  );
}

/* ---------------- Primary Database tab ---------------- */
function PrimaryTab({ source }: { source: TrustSource }) {
  const toast = useToast();
  const st = useSourceState(source.id);
  const [draft, setDraft] = useState<SqlValue>(() => ({ ...st.primary }));
  const [errs, setErrs] = useState<SqlErrors>({});
  const [browse, setBrowse] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(st.primary);
  const save = () => {
    const e = sqlErrors(draft); setErrs(e);
    if (Object.keys(e).length) { toast({ variant: 'error', title: 'Primary Database', message: 'Please enter the SQL Server, credentials and database.' }); return; }
    const v = { ...draft, server: draft.server.trim(), database: draft.database.trim() };
    patchSource(source.id, (s) => ({ ...s, primary: v }));
    setDraft(v);
    toast({ variant: 'success', title: 'Primary database saved', message: `${v.database} on ${v.server} is the primary database.` });
  };
  return (
    <>
      <SetCard title="Edit Primary Database"
        footer={<>
          <Button disabled={!dirty} onClick={() => { setDraft({ ...st.primary }); setErrs({}); }}>Cancel</Button>
          <Button variant="primary" icon="save" disabled={!dirty} onClick={save}>Save</Button>
        </>}>
        <div className="page-form form-col">
          <SqlBlock value={draft} errors={errs} onChange={(v) => { setDraft(v); setErrs({}); }} onBrowse={() => setBrowse(true)} onTest={() => toast(testConnection(draft))} />
        </div>
      </SetCard>
      {browse && <EnumerateSqlDialog open onClose={() => setBrowse(false)} onPick={(s) => setDraft((d) => ({ ...d, server: s }))} />}
    </>
  );
}

/* ---------------- Secondary Database(s) tab ---------------- */
function SecondaryTab({ source }: { source: TrustSource }) {
  const toast = useToast();
  const st = useSourceState(source.id);
  const [checked, setChecked] = useState<string[]>([]);
  const [edit, setEdit] = useState<{ ids: string[] } | null>(null);
  const [del, setDel] = useState<string[] | null>(null);
  const rowsOf = (ids: string[]) => st.secondary.filter((r) => ids.includes(r.id));
  const live = checked.filter((id) => st.secondary.some((r) => r.id === id));

  const initialFor = (ids: string[]) => {
    const rows = rowsOf(ids);
    if (!rows.length) return undefined;
    const db = rows[0].database;
    return { db: { server: rows[0].sqlServer, auth: 'windows' as const, mode: DATABASES.includes(db) ? 'select' as const : 'create' as const, database: db }, fileServers: rows.map((r) => r.fileServer) };
  };

  return (
    <>
      <DataTable<SecondaryDb>
        title="Secondary Database(s)" noun={['mapping', 'mappings']} rows={st.secondary} rowKey={(r) => r.id} selectable="multi" selected={live} onSelectedChange={setChecked}
        toolbar={live.length === 0
          ? <Button variant="primary" icon="plus" onClick={() => setEdit({ ids: [] })}>Add database</Button>
          : <>
            <Button variant="danger" icon="trash" onClick={() => setDel(live)}>Delete database</Button>
            <Button variant="primary" icon="edit" onClick={() => setEdit({ ids: live })}>Edit database</Button>
          </>}
        empty={<EmptyState icon="database" title="No secondary database added." message="Click Add Database to map file servers to a database." />}
        columns={[
          { key: 'fileServer', header: 'File Server(s)', sortable: true, filterable: true },
          { key: 'sqlServer', header: 'SQL Server', sortable: true, filterable: true },
          { key: 'database', header: 'Database', sortable: true, filterable: true },
        ]}
        rowActions={(r) => <>
          <IconButton icon="trash" danger label={`Delete database for ${r.fileServer}`} onClick={() => setDel([r.id])} />
          <IconButton icon="edit" label={`Edit database for ${r.fileServer}`} onClick={() => setEdit({ ids: [r.id] })} />
        </>}
      />
      {edit && (
        <DatabaseSettingsDialog open initial={initialFor(edit.ids)} onClose={() => setEdit(null)}
          onDone={(r) => {
            const server = r.db.server.trim(); const base = r.db.database.trim();
            const fresh: SecondaryDb[] = r.fileServers.map((fs) => ({ id: uid('sdb'), fileServer: fs, sqlServer: server, database: r.separate ? `${base}_${fs}` : base }));
            patchSource(source.id, (s) => ({ ...s, secondary: [...s.secondary.filter((x) => !edit.ids.includes(x.id) && !r.fileServers.includes(x.fileServer)), ...fresh] }));
            setChecked([]);
            toast({ variant: 'success', title: edit.ids.length ? 'Database updated' : 'Database added', message: `${plural(fresh.length, 'file server')} mapped to ${server}.` });
          }} />
      )}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete database" confirmLabel="Delete"
        message={del ? `Remove the secondary database mapping for ${plural(del.length, 'file server')}?` : ''}
        onConfirm={() => {
          if (!del) return;
          patchSource(source.id, (s) => ({ ...s, secondary: s.secondary.filter((x) => !del.includes(x.id)) }));
          setChecked((c) => c.filter((id) => !del.includes(id)));
          toast({ variant: 'success', title: 'Database deleted', message: `${plural(del.length, 'mapping')} removed.` });
          setDel(null);
        }} />
    </>
  );
}
