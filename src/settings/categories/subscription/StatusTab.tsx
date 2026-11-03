import { useState } from 'react';
import { BrandMark, ConfirmDialog, DataTable, EmptyState, Icon, IconButton, ToneTag, useToast } from '../../../ui';
import type { Column } from '../../../ui';
import { SUB, deleteDelivery, subStore } from '../../../stores/subscription';
import type { DeliveryRecord } from '../../../stores/subscription';

/* SCR-SAD-13 Subscription Status (INT-SAD-271 … 277) + DLG-SAD-29 Delete delivery record.
   Folder tree (one open at a time) → Delivered / Failed leaf → table → email preview. */

type Outcome = 'Delivered' | 'Failed';
const DEFAULT_FOLDER = 'Activity Outside of Business Hours';

export default function StatusTab() {
  const toast = useToast();
  const deliveries = subStore.use((s) => s.deliveries);
  const [openFolder, setOpenFolder] = useState<string | null>(DEFAULT_FOLDER);
  const [sel, setSel] = useState<{ folder: string; outcome: Outcome }>({ folder: DEFAULT_FOLDER, outcome: 'Delivered' });
  const [rowId, setRowId] = useState<string | null>(null);
  const [pending, setPending] = useState<DeliveryRecord | null>(null);

  const rows = deliveries.filter((d) => d.folder === sel.folder && d.outcome === sel.outcome);
  const row = rows.find((r) => r.id === rowId) ?? rows[0];
  const count = (folder: string, outcome: Outcome) => deliveries.filter((d) => d.folder === folder && d.outcome === outcome).length;
  const pick = (folder: string, outcome: Outcome) => { setSel({ folder, outcome }); setRowId(null); };

  const columns: Column<DeliveryRecord>[] = [
    { key: 'subscription', header: 'Subscription Name', sortable: true, minWidth: 170 },
    { key: 'from', header: 'From', sortable: true, minWidth: 180 },
    { key: 'to', header: 'To', sortable: true, minWidth: 170 },
    { key: 'subject', header: 'Subject', sortable: true, minWidth: 240 },
    { key: 'sentOn', header: 'Sent On', sortable: true, minWidth: 190 },
    { key: 'scheduleType', header: 'Schedule Type', sortable: true, minWidth: 120 },
    { key: 'duration', header: 'Duration', sortable: true, minWidth: 120 },
    {
      key: 'actions', header: 'Action', width: 96,
      render: (d) => (
        <span className="row">
          {d.outcome === 'Failed' && (
            <IconButton icon="send" label={`Resend ${d.subscription}`} data-tip="Resend"
              onClick={() => toast({ variant: 'info', title: 'Resend queued', message: `${d.report} will be sent to ${d.to} again.` })} />
          )}
          <IconButton icon="trash" danger label={`Delete delivery of ${d.subscription}`} data-tip="Delete" onClick={() => setPending(d)} />
        </span>
      ),
    },
  ];

  return (
    <div className="subscription-status">
      <section className="lf-card folders subscription-tree">
        <ul className="tree" role="tree" aria-label="Subscription reports">
          {SUB.STATUS_FOLDERS.map((f) => {
            const open = openFolder === f;
            return (
              <li key={f} role="treeitem" aria-expanded={open} aria-selected={false}>
                <button type="button" aria-expanded={open} onClick={() => setOpenFolder(open ? null : f)}>
                  <Icon name="chevron-right" className="sign" /><Icon name="folder" /><span>{f}</span>
                </button>
                {open && (
                  <ul role="group">
                    {(['Delivered', 'Failed'] as Outcome[]).map((o) => {
                      const n = count(f, o);
                      const cur = sel.folder === f && sel.outcome === o;
                      return (
                        <li key={o} role="treeitem" aria-selected={cur}>
                          <button type="button" aria-current={cur ? 'true' : undefined} onClick={() => pick(f, o)}>
                            <Icon name={o === 'Failed' ? 'alert' : 'check'} /><span>{o} Reports</span>
                            {n > 0 && <span className="n">{n}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="stack subscription-status__main">
        <DataTable className="tablecard--static" title={`${sel.outcome} Reports`} noun={['report', 'reports']} columns={columns} rows={rows}
          rowKey={(d) => d.id} onRowOpen={(d) => setRowId(d.id)} activeKey={row?.id ?? null}
          empty={<EmptyState compact icon="mail" title={`No ${sel.outcome.toLowerCase()} reports for ${sel.folder}.`} />} />

        {row && (
          <section className="lf-card subscription-mail" aria-label="Delivered email">
            <header className="subscription-mail__head">
              <h3>{row.subject}</h3>
              <div className="subscription-mail__meta">
                <div><b>{row.from}</b><span>To : {row.to}</span></div>
                <div className="row"><span>{row.sentOn}</span>{row.outcome === 'Failed' && <ToneTag tone="bad">Failed</ToneTag>}</div>
              </div>
            </header>
            <div className="subscription-mail__body">
              <BrandMark size={40} />
              <p>You have received this notification because the following report has been Subscribed.</p>
              <p><b>Subscription details:</b></p>
              <table className="subscription-mail__table">
                <tbody>
                  <tr><th scope="row">Report Name</th><td>{row.report}</td></tr>
                  <tr><th scope="row">Subscription Name</th><td>{row.subscription}</td></tr>
                  <tr><th scope="row">Subscription Type</th><td>{row.scheduleType}</td></tr>
                  <tr><th scope="row">Schedule Time</th><td>{row.scheduleTime}</td></tr>
                  <tr><th scope="row">Duration</th><td>{row.duration}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} title="Delete delivery record" confirmLabel="Delete"
        message={pending ? `Delete the ${pending.outcome.toLowerCase()} report sent on ${pending.sentOn}? This can't be undone.` : undefined}
        onConfirm={() => {
          if (!pending) return;
          deleteDelivery(pending.id);
          if (pending.id === rowId) setRowId(null);
          toast({ variant: 'success', title: 'Delivery record deleted', message: `${pending.subscription} · ${pending.sentOn}` });
          setPending(null);
        }} />
    </div>
  );
}
