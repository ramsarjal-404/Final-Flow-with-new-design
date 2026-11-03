import { useCallback, useState } from 'react';
import { ConfirmDialog, Segmented } from '../../../ui';
import { setBackupSection, subStore } from '../../../stores/subscription';
import type { BackupSection } from '../../../stores/subscription';
import DatabaseTransfer from './DatabaseTransfer';
import AdRestore from './AdRestore';
import Archives from './Archives';
import './styles.css';

/* SCR-SAD-05 Backup & Restore section shell (INT-SAD-113/114). Sections are page state, not routes;
   the last section used is remembered for the session (subscription module variable).
   GAP-SAD-21 intended: leaving AD Restore with a wizard in progress asks before discarding it. */

const SECTIONS: { value: BackupSection; label: string }[] = [
  { value: 'import', label: 'Import Database' },
  { value: 'export', label: 'Export Database' },
  { value: 'ad-restore', label: 'AD Restore' },
  { value: 'archives', label: 'Archives & Imports' },
];

export default function BackupRestorePage() {
  const section = subStore.use((s) => s.section);
  const [wizardDirty, setWizardDirty] = useState(false);
  const [ask, setAsk] = useState<BackupSection | null>(null);
  const onDirty = useCallback((d: boolean) => setWizardDirty(d), []);

  const go = (v: string) => {
    const next = v as BackupSection;
    if (next === section) return;
    if (section === 'ad-restore' && wizardDirty) { setAsk(next); return; }
    setBackupSection(next);
  };

  return (
    <>
      <div className="backup-restore-nav">
        <Segmented items={SECTIONS} value={section} onChange={go} ariaLabel="Backup & Restore" />
      </div>
      <div role="tabpanel" aria-label={SECTIONS.find((s) => s.value === section)?.label} className="backup-restore-section">
        {section === 'import' && <DatabaseTransfer key="import" mode="import" />}
        {section === 'export' && <DatabaseTransfer key="export" mode="export" />}
        {section === 'ad-restore' && <AdRestore onDirty={onDirty} />}
        {section === 'archives' && <Archives />}
      </div>
      <ConfirmDialog open={!!ask} onClose={() => setAsk(null)} title="Discard the restore wizard?" confirmLabel="Discard"
        message="The Lepide Object Restore wizard in progress will be lost."
        onConfirm={() => { if (ask) setBackupSection(ask); setAsk(null); }} />
    </>
  );
}
