import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, IconButton, useToast } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { adminStore, formatDateTime, useDateFormat, type LogEntry } from '../../../stores/admin';
import { AdminTable, useTable, type Col } from '../general/kit';
import { DateRangePopover, presetRange, type LogRange } from './DateRangePopover';
import { DeleteLogonActivity } from './DeleteLogonActivity';
import './styles.css';

/* SCR-SAD-04 · Logs — the admin audit trail. Pending range (chip) vs applied range (table):
   the table changes only on "Generate logs". A range ending today or later is open-ended so lines
   written while on the page still appear. Sub-page: /settings/logs/delete-logon-activity (DLG-SAD-08). */

const SUB_DELETE = 'delete-logon-activity';

function inRange(logs: LogEntry[], r: LogRange) {
  const from = r.from.getTime();
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const open = r.to.getTime() >= startToday.getTime();
  const to = r.to.getTime();
  return logs.filter((l) => { const t = Date.parse(l.performedOn); return t >= from && (open || t <= to); });
}

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;
const p2 = (n: number) => String(n).padStart(2, '0');

export default function LogsPage() {
  const toast = useToast();
  const nav = useNavigate();
  const sub = useParams()['*'];
  const logs = adminStore.use((s) => s.logs);
  const fmt = useDateFormat();
  const [pending, setPending] = useState<LogRange>(() => presetRange('Last 7 Days'));
  const [applied, setApplied] = useState<LogRange>(pending);
  const [generation, setGeneration] = useState(0);

  const rows = useMemo(() => inRange(logs, applied), [logs, applied]);
  const cols = useMemo<Col<LogEntry>[]>(() => [
    { key: 'action', header: 'Action', sortable: true, filterable: true, tip: true, minWidth: 360 },
    { key: 'byWhom', header: 'By Whom', sortable: true, filterable: true, minWidth: 160 },
    { key: 'performedOn', header: 'Performed On', sortable: true, filterable: true, minWidth: 200,
      text: (l) => formatDateTime(l.performedOn, fmt), sortValue: (l) => Date.parse(l.performedOn) },
  ], [fmt]);
  const model = useTable(rows, cols, { initialSort: { key: 'performedOn', dir: 'desc' } });

  if (sub === SUB_DELETE) return <DeleteLogonActivity onBack={() => nav('/settings/logs')} />;

  const generate = () => {
    setApplied(pending);
    setGeneration((g) => g + 1);
    const n = inRange(adminStore.get().logs, pending).length;
    if (n) toast({ variant: 'success', title: 'Logs generated', message: `${n} log record(s) found for the selected dates.` });
    else toast({ variant: 'info', title: 'Logs generated', message: 'No log records for the selected dates.' });
  };

  const exportCsv = () => {
    const list = model.list;
    if (list.length === 0) {
      toast({ variant: 'error', title: 'Nothing to export', message: 'Generate logs for a date range that has records.' });
      return;
    }
    const lines = ['Action,By Whom,Performed On', ...list.map((l) => [l.action, l.byWhom, formatDateTime(l.performedOn, fmt)].map(csvCell).join(','))];
    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const a = document.createElement('a');
    a.href = url; a.download = `Lepide-Logs-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ variant: 'success', title: 'Logs exported', message: `${list.length} record(s) downloaded as CSV.` });
  };

  return (
    <>
      <HeaderActions>
        <IconButton icon="trash" bordered label="Delete Logon Activity" onClick={() => nav('/settings/logs/' + SUB_DELETE)} />
        <Button variant="ghost" icon="download" aria-label="Export logs" data-tip="Export logs (CSV)" onClick={exportCsv}>Export</Button>
        <span className="logs-lbl">Select date</span>
        <DateRangePopover value={pending} onApply={setPending} />
        <Button variant="primary" onClick={generate}>Generate logs</Button>
      </HeaderActions>

      <AdminTable model={model} cols={cols} rowKey={(l) => l.id} label="Logs" noun={['record', 'records']}
        paging={{ sizes: [10, 20, 50, 100], defaultSize: 50, resetKey: String(generation) }}
        empty={<EmptyState compact icon="file-search" title="No log records for the selected dates." message="Pick another range and click Generate Logs." />} />
    </>
  );
}
