import { useEffect, useState } from 'react';
import { Button, Icon, Modal, TextAreaField, TextField, Toggle, useToast, type IconName } from '../../ui';
import { aiStore, closeTune, saveTune, TUNE_DEFAULT, type TuneDraft } from './store';

/* DLG-AI-02 Alert Configuration · Edit Alert, as the Lepide Design System settings-style dialog with vertical tabs.
   GAP-AI-05 (intended): the draft belongs to the alert that opened it, "Alert Name" is required, and
   Done saves with a confirmation toast. Unsaved edits stay in memory while the page is open (INT-AI-057). */

type Tab = 'general' | 'filter' | 'alert-settings';
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'filter', label: 'Filter', icon: 'filter' },
  { id: 'alert-settings', label: 'Alert settings', icon: 'bell' },
];

export function EditAlertDialog({ unsaved }: { unsaved: Map<string, TuneDraft> }) {
  const alertId = aiStore.use((s) => s.tuneAlertId);
  const saved = aiStore.use((s) => s.tuneSaved);
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('general');
  const [draft, setDraft] = useState<TuneDraft>(TUNE_DEFAULT);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alertId) return;
    setTab('general'); setError(null);
    setDraft(unsaved.get(alertId) ?? saved[alertId] ?? TUNE_DEFAULT);
  }, [alertId]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (patch: Partial<TuneDraft>) => setDraft((d) => {
    const next = { ...d, ...patch };
    if (alertId) unsaved.set(alertId, next);
    return next;
  });
  const close = () => closeTune();
  const done = () => {
    if (!alertId) return;
    if (!draft.name.trim()) { setTab('general'); setError('Alert Name is required'); return; }
    const clean = { ...draft, name: draft.name.trim() };
    unsaved.delete(alertId);
    saveTune(alertId, clean);
    toast({ variant: 'success', title: 'Alert configuration', message: `Changes to "${clean.name}" were saved.` });
  };
  const next = () => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (i < TABS.length - 1) setTab(TABS[i + 1].id); else close();
  };

  return (
    <Modal open={!!alertId} onClose={close} title="Alert configuration" subtitle="Edit alert" icon={null}
      footer={<><Button onClick={next}>Next</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <div className="lepide-ai-tune">
        <nav className="tabs" aria-label="Alert configuration sections">
          {TABS.map((t) => (
            <button key={t.id} type="button" aria-current={t.id === tab ? 'step' : undefined} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={15} /><span style={{ flex: 1 }}>{t.label}</span>{t.id === tab && <Icon name="chevron-right" size={14} />}
            </button>
          ))}
        </nav>
        <div className="tabs__pane" key={tab}>
          {tab === 'general' && (<>
            <div className="status-row">
              <TextField label="Alert Name" value={draft.name} error={error} maxLength={200}
                onChange={(v) => { edit({ name: v }); if (v.trim()) setError(null); }} />
              <div className="st"><span aria-hidden="true">Status</span><Toggle label="Status" checked={draft.status} onChange={(v) => edit({ status: v })} /></div>
            </div>
            <TextAreaField label="Description" rows={3} value={draft.description} maxLength={1000} onChange={(v) => edit({ description: v })} />
            <div className="fld">
              <span className="fld__lbl">Select Report</span>
              <div className="tree-pick" aria-label="Select Report">
                <div className="tree-pick__node"><Icon name="minus" size={14} />Active Directory</div>
                <div className="tree-pick__leaf"><span className="tree-pick__check" role="img" aria-label="Selected" />Potential brute force attack</div>
              </div>
            </div>
          </>)}
          {tab === 'filter' && <p className="modal__note">Filter configuration appears here.</p>}
          {tab === 'alert-settings' && <p className="modal__note">Alert delivery settings (email, schedule, recipients) appear here.</p>}
        </div>
      </div>
    </Modal>
  );
}
