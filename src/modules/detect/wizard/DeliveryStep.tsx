import { useState } from 'react';
import { Button, Checkbox, IconButton, SelectField } from '../../../ui';
import { deliveryStore } from '../../../stores/deliveryAccounts';
import { ACTION_SHORT, ALERT_TYPES, type AlertType } from '../model';
import { AgentDialog } from '../AccountDialogs';
import type { Draft } from './types';

/* DLG-DET-08 · Wizard step 3 · Delivery Settings. */
export function DeliveryStep({ d, set, onOpen, onAdd }: { d: Draft; set: (p: Partial<Draft>) => void; onOpen: (index: number) => void; onAdd: () => void }) {
  const agents = deliveryStore.use((s) => s.agents);
  const [agentOpen, setAgentOpen] = useState(false);
  return (
    <>
      <section className="lf-card tablecard tablecard--flat">
        <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
          <Button icon="plus" onClick={onAdd}>Add action</Button>
        </div>
        <div className="tbl-wrap">
          <table className="lf-table">
            <thead><tr><th style={{ width: 140 }}>Action</th><th>Details</th><th style={{ width: 64 }}><span className="sr-only">Remove</span></th></tr></thead>
            <tbody>
              {d.actions.length === 0 ? (
                <tr><td colSpan={3} className="tbl-empty">No actions yet. Click <b>Add action</b> to choose how this alert is delivered.</td></tr>
              ) : d.actions.map((a, i) => (
                <tr key={a.id} className="lf-row" onClick={(e) => { if (!(e.target as Element).closest('button')) onOpen(i); }}>
                  <td><b>{ACTION_SHORT[a.kind]}</b></td>
                  <td className="detect-ellipsis" title={a.details}>
                    <span tabIndex={0} role="button" aria-label={`Edit ${ACTION_SHORT[a.kind]} action: ${a.details}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(i); } }}>{a.details}</span>
                  </td>
                  <td className="lf-row__end">
                    <IconButton icon="trash" danger label={`Remove ${ACTION_SHORT[a.kind]} action`}
                      onClick={() => set({ actions: d.actions.filter((x) => x.id !== a.id) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="detect-box stack">
        <Checkbox checked={d.processRemotely} onChange={(v) => set({ processRemotely: v, agent: v ? d.agent : '' })} label="Process alert remotely" />
        <div className="detect-inline-field">
          <SelectField label="Select agent server" placeholder="Select" options={agents} value={d.agent} disabled={!d.processRemotely} onChange={(v) => set({ agent: v })} />
          <Button icon="plus" disabled={!d.processRemotely} onClick={() => setAgentOpen(true)}>Add agent</Button>
        </div>
        <div style={{ maxWidth: 360 }}>
          <SelectField label="Alert type" options={ALERT_TYPES} value={d.alertType} onChange={(v) => set({ alertType: v as AlertType })} />
        </div>
      </div>

      <AgentDialog open={agentOpen} onClose={() => setAgentOpen(false)} onCreated={(ip) => set({ agent: ip })} />
    </>
  );
}
