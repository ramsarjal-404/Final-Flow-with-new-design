import { useEffect, useState } from 'react';
import { Button, Checkbox, DataTable, EmptyState, Field, IconButton, Modal, useToast } from '../../../ui';
import { idfStore, newId, saveCentral } from './store';
import type { CentralServer, IdfSource, SqlValue } from './store';
import { SqlFields, sqlErrors } from './Dialogs';
import type { SqlErrors } from './Dialogs';
import { Console, Tip } from './shared';

/* ---------- DLG-SDS-65 · SQL Server Settings ---------- */
function SqlServerDialog({ open, initial, onClose }: { open: boolean; initial: CentralServer | null; onClose: () => void }) {
  const toast = useToast();
  const blank: SqlValue = { server: '', auth: 'sql', user: '', password: '', dbMode: 'select', db: '0365' };
  const [v, setV] = useState<SqlValue>(blank);
  const [tested, setTested] = useState(false);
  const [conn, setConn] = useState('20');
  const [query, setQuery] = useState('60');
  const [imp, setImp] = useState(false);
  const [errs, setErrs] = useState<SqlErrors & { conn?: string; query?: string }>({});
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setV({ server: initial.server, auth: initial.auth, user: initial.user, password: initial.password, dbMode: initial.dbMode, db: initial.db });
      setTested(true); setConn(initial.connTimeout); setQuery(initial.queryTimeout); setImp(initial.importPrevious);
    } else { setV(blank); setTested(false); setConn('20'); setQuery('60'); setImp(false); }
    setErrs({});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = () => {
    const list: [string, string][] = [...sqlErrors(v, tested)];
    if (!list.length) {
      if (!/^\d+$/.test(conn) || Number(conn) < 1) list.push(['conn', 'Connection time out must be a whole number of seconds.']);
      if (!/^\d+$/.test(query) || Number(query) < 1) list.push(['query', 'Query time out must be a whole number of seconds.']);
    }
    if (list.length) { setErrs(Object.fromEntries(list)); toast({ variant: 'error', title: 'Check the highlighted fields', message: list[0][1] }); return; }
    saveCentral({ ...v, server: v.server.trim(), db: v.db.trim(), id: initial?.id ?? newId('cs'), connTimeout: conn, queryTimeout: query, importPrevious: imp });
    toast({ variant: 'success', title: 'Server details saved', message: `${v.server.trim()} / ${v.db.trim()} is the centralized server.` });
    onClose();
  };
  const digits = (s: string) => s.replace(/\D/g, '').slice(0, 4);
  return (
    <Modal open={open} onClose={onClose} escapeCloses={false} title="SQL Server Settings" icon="database" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <SqlFields value={v} onChange={(x) => { setV(x); setErrs({}); }} tested={tested} setTested={setTested} errors={errs} />
      <p className="section-label">Time out Settings</p>
      <div className="fld-row">
        <Field label="Connection Time Out" error={errs.conn}>
          <div className="identify-unit"><input aria-label="Connection Time Out" inputMode="numeric" value={conn} onChange={(e) => { setConn(digits(e.target.value)); setErrs({}); }} /><span className="muted text-sm">Seconds</span></div>
        </Field>
        <Field label="Query Time Out" error={errs.query}>
          <div className="identify-unit"><input aria-label="Query Time Out" inputMode="numeric" value={query} onChange={(e) => { setQuery(digits(e.target.value)); setErrs({}); }} /><span className="muted text-sm">Seconds</span></div>
        </Field>
      </div>
      <Checkbox label="Import previously classified files information to this database" checked={imp} onChange={setImp} />
    </Modal>
  );
}

/* ---------- SCR-SDS-20 · Centralized Server Communication Details ---------- */
export function ServersPage({ source }: { source: IdfSource }) {
  const central = idfStore.use((s) => s.central);
  const [dlg, setDlg] = useState<null | { row: CentralServer | null }>(null);
  const has = central.length > 0;
  return (
    <Console source={source} title="Centralized Server Communication Details" crumbs={[{ label: 'Centralized Communication Server Details' }]}
      actions={
        <Tip tip={has ? 'A centralized server is already configured — edit it instead.' : undefined}>
          <Button variant="primary" icon="plus" disabled={has} onClick={() => setDlg({ row: null })}>Add server detail</Button>
        </Tip>
      }>
      <DataTable title="Centralized Server" noun={['server', 'servers']} rows={central} rowKey={(c) => c.id}
        columns={[
          { key: 'server', header: 'SQL Server', sortable: true },
          { key: 'auth', header: 'Authentication Mode', sortable: true, value: (c) => (c.auth === 'sql' ? 'SQL Authentication' : 'Windows Authentication') },
          { key: 'db', header: 'Database', sortable: true },
        ]}
        rowActions={(c) => <IconButton icon="edit" label={`Edit ${c.server}`} onClick={() => setDlg({ row: c })} />}
        empty={<EmptyState icon="database" title="No centralized server configured. Click Add Server Detail to set one up." />} />
      <SqlServerDialog open={!!dlg} initial={dlg?.row ?? null} onClose={() => setDlg(null)} />
    </Console>
  );
}
