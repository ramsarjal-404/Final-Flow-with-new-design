import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, EmptyState, Icon, IconButton, Modal, Segmented, TextField, useToast } from '../../ui';
import {
  ReportPager, csvBlob, queueReportExport, reportFileName, useTableModel, type RCol, type RenderCellArgs,
} from '../../reports';

/* Trust investigation dialogs of the generic report view (MOD-RLIB, `[Secondary source]`, Lepide Design System 08 § 3:
   modal default width, tables as a table card without the outer shadow), wired through the module's
   `renderCell`:
   - DLG-RLIB-13 Account lockout investigation — "Click here to Investigate" in the "Why" column of
     `account-lockout-report`; DLG-RLIB-14 Select Computer Name from its "Browse".
   - DLG-RLIB-15 Privilege Via Group(s) — explore action on a "Permission Method" cell of
     `users-with-admin-privileges` whose value includes "Indirect via group(s)".
   The original demo filled the investigation with fixed findings; the findings below are the
   prototype's simulated result (no seed exists for them). */

const LOCKOUT_SLUG = 'account-lockout-report';
const ADMIN_SLUG = 'users-with-admin-privileges';

export function renderTrustCell({ slug, column, value, cells, columns, row }: RenderCellArgs): ReactNode | undefined {
  const at = (h: string) => cells[columns.indexOf(h)] ?? '';
  if (slug === LOCKOUT_SLUG && column === 'Why') {
    return <InvestigateLink user={at('User Name')} computer={at('From')} reportId={row.id} reportName={row.name} />;
  }
  if (slug === ADMIN_SLUG && column === 'Permission Method' && /indirect via group\(s\)/i.test(value)) {
    return <PrivilegeCell method={value} user={at('User Name')} group={at('Group Name')} />;
  }
  return undefined;
}

/** Dialogs are portalled, but React events still bubble to the table row (which would open the record
    drawer): the trigger cells stop clicks here (keys are left alone: the dialogs listen on document). */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/* ---------------- DLG-RLIB-15 · Privilege Via Group(s) ---------------- */

/** Group chain from the original demo ("A->B<NEXT>C"): each "->" / "<NEXT>" is one hop down to the user. */
const DEMO_CHAIN = 'LPDE4.LOCAL\\Domain Admins->LPDE4.LOCAL\\UK Finance<NEXT>LPDE4.LOCAL\\UK Sales';
const chainFor = (group: string) => {
  const hops = DEMO_CHAIN.split(/->|<NEXT>/);
  return group && hops[0].toLowerCase() !== group.toLowerCase() ? [group, ...hops.slice(1)] : hops;
};

function PrivilegeCell({ method, user, group }: { method: string; user: string; group: string }) {
  const [open, setOpen] = useState(false);
  const hops = chainFor(group);
  return (
    <span className="tru-method" onClick={stop}>
      <span className="tru-method__t">{method}</span>
      <IconButton icon="users" label="Privilege Via Group(s)" className="tru-explore" onClick={() => setOpen(true)} />
      {open && (
        <Modal open onClose={() => setOpen(false)} title="Privilege Via Group(s)" subtitle={user} icon="users" bodyClassName="tru-modal"
          footer={<Button variant="primary" onClick={() => setOpen(false)}>Close</Button>}>
          <h4 className="tru-chain__h">Group</h4>
          <ol className="tru-chain" aria-label={`Group chain granting ${user} the privilege`}>
            {hops.map((g, i) => (
              <li key={i} style={{ marginLeft: i * 18 }}><span className="tru-obj__ic" aria-hidden="true"><Icon name="users" size={14} /></span><span>{g}</span></li>
            ))}
            <li style={{ marginLeft: hops.length * 18 }} className="tru-chain__user"><span className="tru-obj__ic" aria-hidden="true"><Icon name="user" size={14} /></span><span>{user}</span></li>
          </ol>
          <p className="sr-only">Raw chain: {hops.join(' -> ')}</p>
        </Modal>
      )}
    </span>
  );
}

/* ---------------- DLG-RLIB-13 · Account lockout investigation ---------------- */

const TABS = ['COM Objects', 'Schedule Tasks', 'Mapped Network Drives', 'Logon Sessions', 'Services'] as const;
type Tab = (typeof TABS)[number];
type Finding = { k: string; name: string; value: string; description: string };

/** Simulated findings for `user` on `computer` (prototype: fixed result, like the original demo). */
function findingsFor(user: string, computer: string): Record<Tab, Finding[]> {
  const sam = user.split('\\').pop() ?? user;
  const f = (rows: [string, string, string][]) => rows.map(([name, value, description], i) => ({ k: String(i), name, value, description }));
  return {
    'COM Objects': [],
    'Schedule Tasks': f([
      ['\\Backup\\Nightly Sync', `Runs as ${user}`, 'Scheduled task stores the account password; a stale password locks the account at each run.'],
      ['\\Office\\Mailbox Refresh', `Runs as ${user}`, 'Last run result: Logon failure (0x8007052E).'],
    ]),
    'Mapped Network Drives': f([
      ['S:', `\\\\DCD01\\Company Share (as ${sam})`, 'Persistent drive mapping reconnects with saved credentials.'],
    ]),
    'Logon Sessions': f([
      [`${computer}\\Console`, `${user} (Interactive)`, 'Active interactive session on the computer the lockout came from.'],
      [`${computer}\\RDP-Tcp#3`, `${user} (Disconnected)`, 'Disconnected remote session still holding cached credentials.'],
    ]),
    Services: f([
      ['SyncAgent', `Log on as ${user}`, 'Service configured to log on with the user account.'],
    ]),
  };
}
const FINDING_COLS: RCol<Finding>[] = [
  { key: 'name', header: 'Name', filterable: true, minWidth: 200, value: (r) => r.name },
  { key: 'value', header: 'Value', filterable: true, minWidth: 220, value: (r) => r.value },
  { key: 'description', header: 'Description', filterable: true, minWidth: 320, value: (r) => r.description, cls: 'td-wrap' },
];

function InvestigateLink({ user, computer, reportId, reportName }: { user: string; computer: string; reportId: string; reportName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span onClick={stop}>
      <button type="button" className="tru-cell-link" onClick={() => setOpen(true)}>Click here to Investigate</button>
      {open && <LockoutDialog user={user} computer={computer} reportId={reportId} reportName={reportName} onClose={() => setOpen(false)} />}
    </span>
  );
}

function LockoutDialog({ user, computer: start, reportId, reportName, onClose }: {
  user: string; computer: string; reportId: string; reportName: string; onClose: () => void;
}) {
  const toast = useToast();
  const [computer, setComputer] = useState(start);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [browse, setBrowse] = useState(false);
  const timer = useRef<number>();
  const data = useMemo(() => findingsFor(user, computer), [user, computer]);
  const rows = state === 'done' ? data[tab] : [];
  const model = useTableModel({ rows, columns: FINDING_COLS, pageSizes: [5, 10, 20, 50, 100], defaultPageSize: 10, resetKey: `${tab}|${state}` });

  const investigate = () => {
    if (!computer.trim()) return;
    setState('busy'); clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setState('done'); setTab(TABS[0]); }, 700);
  };
  const exportFindings = () => {
    const all = TABS.flatMap((t) => data[t].map((r) => [t, r.name, r.value, r.description]));
    const n = all.length; const title = `${reportName} - ${user}`;
    queueReportExport({
      reportId, reportName: title, format: 'CSV', filtersApplied: false, fileName: reportFileName(`Account lockout investigation ${user}`, 'csv'),
      build: () => csvBlob(['Category', 'Name', 'Value', 'Description'], all),
      done: { variant: 'success', title: 'Export', message: `CSV with ${n} record(s) downloaded.` }, failTitle: 'Export',
    });
    toast({ variant: 'info', title: 'Export queued', message: `CSV with ${n} record(s) is being prepared in Settings › Exported Files.` });
  };

  return (
    <>
      <Modal open onClose={onClose} title="Account lockout investigation" subtitle={user} icon="lock" bodyClassName="tru-modal"
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onClose}>OK</Button></>}>
        <p className="tru-lead">Click on the investigate button to know the cause of the account lockout</p>
        <div className="tru-lock__grid">
          <TextField label="Account Status" value="Unlocked" readOnly />
          <TextField label="User Name" value={user} readOnly />
        </div>
        <div className="tru-lock__on">
          <TextField label="Investigate lockout on" value={computer} onChange={setComputer} placeholder="Computer name" maxLength={200} />
          <Button icon="search" onClick={() => setBrowse(true)}>Browse</Button>
        </div>
        <div className="row row--end">
          <Button icon="download" disabled={state !== 'done'} onClick={exportFindings}>Export</Button>
          <Button variant="primary" icon="search" loading={state === 'busy'} disabled={!computer.trim()} onClick={investigate}>Investigate</Button>
        </div>
        <Segmented ariaLabel="Findings" value={tab} onChange={(v) => setTab(v as Tab)} items={TABS.map((t) => ({ value: t, label: t, disabled: state !== 'done' }))} />
        <section className="lf-card tablecard tablecard--flat tablecard--static tru-modal__table" aria-label={tab}>
          {state === 'done' && tab === 'COM Objects' ? (
            <EmptyState compact icon="info" title="COM Objects information not available" message={`No COM object data was returned by ${computer}.`} />
          ) : (
            <FindingsTable model={model} state={state} />
          )}
        </section>
      </Modal>
      {browse && <SelectComputerDialog onClose={() => setBrowse(false)} onAdd={(c) => { setComputer(c); setState('idle'); setBrowse(false); }} />}
    </>
  );
}

function FindingsTable({ model, state }: { model: ReturnType<typeof useTableModel<Finding>>; state: 'idle' | 'busy' | 'done' }) {
  const msg = state === 'idle' ? 'Click "Investigate" to view the findings.' : state === 'busy' ? 'Investigating…'
    : model.processed.length === 0 ? 'No results match your search or filters.' : null;
  return (
    <>
      <div className="tbl-wrap">
        <table className="lf-table">
          <thead>
            <tr>{FINDING_COLS.map((c) => <th key={c.key} style={{ minWidth: c.minWidth }}>{c.header}</th>)}</tr>
            <tr className="filter-row">
              {FINDING_COLS.map((c) => (
                <th key={c.key}><span className={'filter-input' + (model.filters[c.key] ? ' has-value' : '')}><Icon name="search" size={12} />
                  <input value={model.filters[c.key] ?? ''} placeholder="Filter" aria-label={`Filter ${c.header}`} maxLength={200} onChange={(e) => model.setFilter(c.key, e.target.value)} /></span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {msg ? <tr><td colSpan={FINDING_COLS.length} className="tbl-empty" role={state === 'busy' ? 'status' : undefined}>{msg}</td></tr>
              : model.slice.map((r) => (
                <tr key={r.k}>{FINDING_COLS.map((c) => <td key={c.key} className={c.cls} title={String(c.value(r))}>{String(c.value(r))}</td>)}</tr>
              ))}
          </tbody>
        </table>
      </div>
      <ReportPager total={state === 'done' ? model.processed.length : 0} label={(n) => `Total Records - ${n}`} page={model.page} pages={model.pages}
        size={model.size} sizes={model.pageSizes} onPage={model.setPage} onSize={model.setSize} />
    </>
  );
}

/* ---------------- DLG-RLIB-14 · Select Computer Name ---------------- */

/** Computer names that occur in the Trust demo dataset (From / Where columns of the report views). */
const COMPUTERS = ['DCD01', 'DMD01', 'RECEPTION-PC', 'ROGSTRIX-SCAR'];

function SelectComputerDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (c: string) => void }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [pick, setPick] = useState<string | null>(null);
  const shown = COMPUTERS.filter((c) => c.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Modal open onClose={onClose} title="Select Computer Name" icon="server" size="sm" bodyClassName="tru-modal"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!pick} onClick={() => pick && onAdd(pick)}>Add</Button></>}>
      <form className="tru-lock__on" onSubmit={(e) => { e.preventDefault(); setQuery(q); setPick(null); }}>
        <TextField label="Search Computer:" value={q} onChange={setQ} placeholder="Search Computer Name" maxLength={200} />
        <Button type="submit" icon="search">Search</Button>
      </form>
      <section className="lf-card tablecard tablecard--flat tablecard--static tru-modal__table" aria-label="Computers">
        <div className="tbl-wrap">
          <table className="lf-table">
            <thead><tr><th>Name</th></tr></thead>
            <tbody>
              {shown.length === 0 ? <tr><td className="tbl-empty">No results match your search or filters.</td></tr>
                : shown.map((c) => (
                  <tr key={c} className={'lf-row' + (pick === c ? ' is-sel' : '')} tabIndex={0} aria-selected={pick === c}
                    onClick={() => setPick(c)} onDoubleClick={() => onAdd(c)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPick(c); } }}>
                    <td><span className="tru-obj"><span className="tru-obj__ic" aria-hidden="true"><Icon name="server" size={14} /></span>{c}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </Modal>
  );
}
