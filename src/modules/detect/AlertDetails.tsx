import { useEffect, useState } from 'react';
import { Button, KeyValues, Modal, SettingRow, Toggle, ToneTag, type StatusTone } from '../../ui';
import { deliveryMechanism, filterBlocks, sendToOf, type FilterBlock, type ThreatAlert } from './model';
import { ClearableSearch, SidePanel } from './parts';

export const TYPE_TONE: Record<string, StatusTone> = { Critical: 'bad', Warning: 'warn', Normal: 'good' };

/** One "Report Name: …" block with its numbered rules. */
function Blocks({ blocks }: { blocks: FilterBlock[] }) {
  return (
    <div className="detect-blocks">
      {blocks.map((b, i) => (
        <section key={b.report + i} className="detect-block">
          <p className="detect-block__name"><span>Report Name:</span> {b.report}</p>
          {b.rules.length ? (
            <ol>{b.rules.map((r, j) => <li key={j}>{r}</li>)}</ol>
          ) : <p className="detect-block__none">No filters: every change is alerted.</p>}
        </section>
      ))}
    </div>
  );
}

/* ---------------- DLG-DET-01 · Alert Details panel ---------------- */
export function AlertDetailsPanel({ alert, onClose, onStatus }: { alert: ThreatAlert; onClose: () => void; onStatus: (on: boolean) => void }) {
  const [more, setMore] = useState(false);
  const [q, setQ] = useState('');
  // Opening another alert resets "Show more" and its search.
  useEffect(() => { setMore(false); setQ(''); }, [alert.id]);
  const blocks = filterBlocks(alert);
  const sendTo = sendToOf(alert);
  const query = q.trim().toLowerCase();
  const shown = blocks.filter((b) => !query || b.report.toLowerCase().includes(query));

  return (
    <SidePanel label="Alert details" title="Alert details" closeLabel="Close alert details" onClose={onClose} holdEscape={more}
      footer={<Button onClick={onClose}>Close</Button>}>
      <div className="stack">
        <KeyValues items={[{ label: 'Alert Name', value: alert.name, wide: true }]} />
        <SettingRow title="Status" help={alert.status}>
          <Toggle label="Status" checked={alert.status === 'Enabled'} onChange={onStatus} />
        </SettingRow>
        <div className="stack stack--sm">
          <h4 className="detect-sec">Filters</h4>
          <Blocks blocks={blocks.slice(0, 2)} />
          {/* GAP-DET-08 intended: only when more than two blocks exist. */}
          {blocks.length > 2 && <div><Button size="sm" onClick={() => { setQ(''); setMore(true); }}>Show more</Button></div>}
        </div>
        <KeyValues items={[{ label: 'Delivery mechanism', value: deliveryMechanism(alert) || '—', wide: true }]} />
        <div className="stack stack--sm">
          <h4 className="detect-sec">Action</h4>
          <KeyValues items={[
            ...(sendTo ? [{ label: 'Send To', value: sendTo, wide: true }] : []),
            { label: 'Alert type', value: <ToneTag tone={TYPE_TONE[alert.alertType] ?? 'none'}>{alert.alertType}</ToneTag> },
            ...(alert.processRemotely ? [{ label: 'Agent server', value: alert.agent }] : []),
          ]} />
        </div>
      </div>

      {/* DLG-DET-02 · Alert Details dialog ("Show more") */}
      <Modal open={more} onClose={() => setMore(false)} title="Alert details" subtitle={alert.name} icon="eye" size="md"
        footer={<Button variant="primary" onClick={() => setMore(false)}>Close</Button>}>
        <ClearableSearch value={q} onChange={setQ} placeholder="Report name" ariaLabel="Search report name" autoFocus />
        <div className="detect-more">
          {shown.length ? <Blocks blocks={shown} /> : <p className="detect-empty-line">No reports match "{q.trim()}".</p>}
        </div>
      </Modal>
    </SidePanel>
  );
}
