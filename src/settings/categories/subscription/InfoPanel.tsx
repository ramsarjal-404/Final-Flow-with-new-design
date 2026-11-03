import { useEffect, useState } from 'react';
import { Button, Icon, IconButton, KeyValues, Segmented } from '../../../ui';
import type { ScheduleType, Subscription } from '../../../stores/subscription';

/* DLG-SAD-24 Subscription Information (INT-SAD-278 … 283): non-modal detail panel beside the list.
   Remount with key={sub.id} so the first report opens and the first schedule type is shown. */

const ORDER: ScheduleType[] = ['Daily', 'Weekly', 'Monthly'];

export default function InfoPanel({ sub, onClose, onEdit }: { sub: Subscription; onClose: () => void; onEdit: () => void }) {
  const [open, setOpen] = useState<string[]>(sub.reports.length ? [sub.reports[0]] : []);
  const types = ORDER.filter((t) => sub.schedules.some((s) => s.type === t));
  const [tab, setTab] = useState<string>(sub.schedules[0]?.type ?? types[0] ?? 'Daily');
  const curTab = types.includes(tab as ScheduleType) ? tab : types[0];

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[data-overlay]')) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <aside className="lf-card detail subscription-panel" role="dialog" aria-label="Subscription Information">
      <header className="drawer__head">
        <div><h3>Subscription Information</h3></div>
        <IconButton icon="x" label="Close subscription information" bordered onClick={onClose} />
      </header>
      <div className="drawer__body subscription-panel__body">
        <KeyValues items={[
          { label: 'Subscription Name', value: sub.name, wide: true },
          ...(sub.description ? [{ label: 'Description', value: sub.description, wide: true }] : []),
          { label: 'Status', value: sub.enabled ? 'Enabled' : 'Disabled' },
        ]} />

        <p className="section-label">Filters</p>
        <div className="subscription-accordion">
          {sub.reports.map((r) => {
            const on = open.includes(r);
            const rules = sub.filters[r] ?? [];
            return (
              <div key={r} className="subscription-accordion__item">
                <button type="button" aria-expanded={on} onClick={() => setOpen((xs) => (on ? xs.filter((x) => x !== r) : [...xs, r]))}>
                  <Icon name="chevron-right" size={14} /><span>{r}</span>
                </button>
                {on && (rules.length
                  ? <ol>{rules.map((x) => <li key={x.id}>{`${x.field} ${x.operator} ${x.value}`}</li>)}</ol>
                  : <p className="muted text-sm">No conditions applied</p>)}
              </div>
            );
          })}
        </div>

        {sub.actions.map((a) => (
          <div key={a.id} className="subscription-card">
            <KeyValues items={[
              { label: 'From', value: a.from },
              { label: 'Send To', value: a.to },
              { label: 'Report Format', value: a.formats.join(', ') + (a.kind === 'email' ? ' Attachment' : '') },
              { label: 'Attachment Path', value: a.path, wide: true },
              ...(a.notify ? [{ label: 'Notify', value: a.notify.replace(/^Notify:\s*/, ''), wide: true }] : []),
            ]} />
          </div>
        ))}

        {types.length > 0 && (
          <>
            <Segmented ariaLabel="Schedule type" value={curTab} onChange={setTab} items={types.map((t) => ({ value: t, label: t }))} />
            {sub.schedules.filter((s) => s.type === curTab).map((s) => (
              <div key={s.id} className="subscription-card">
                <KeyValues items={[
                  { label: 'Type', value: s.type }, { label: 'Selection', value: s.selection },
                  { label: 'Time', value: s.time }, { label: 'Duration', value: s.duration },
                ]} />
              </div>
            ))}
          </>
        )}
      </div>
      <footer className="drawer__foot">
        <Button icon="edit" onClick={onEdit}>Edit</Button>
        <Button onClick={onClose}>Close</Button>
      </footer>
    </aside>
  );
}
