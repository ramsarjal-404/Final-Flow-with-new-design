import { useEffect, useRef, useState } from 'react';
import { Button, Card, FileUpload, Icon, ProgressBar, useToast } from '../../../ui';
import { formatDateTime } from '../../../stores/admin';
import { saveBlob } from '../exported-files/download';

/* SCR-SAD-06 Import Database / Export Database (INT-SAD-115 … 119). [Prototype-only] job:
   progress starts at 4 % and adds 12 % every 350 ms; at 100 % waits 300 ms then completes. */

const ACCEPT = ['.bak', '.zip', '.sql', '.mdf'];

export default function DatabaseTransfer({ mode }: { mode: 'import' | 'export' }) {
  const toast = useToast();
  const imp = mode === 'import';
  const [job, setJob] = useState<{ file: string; progress: number } | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const pickRef = useRef<HTMLDivElement>(null);
  const busy = !!job;

  useEffect(() => () => { timers.current.forEach((t) => { clearInterval(t); clearTimeout(t); }); }, []);
  // Busy: the artwork and CTA are disabled.
  useEffect(() => {
    const el = pickRef.current; if (!el) return;
    if (busy) el.setAttribute('inert', ''); else el.removeAttribute('inert');
  }, [busy]);

  const run = (file: string, done: () => void) => {
    let p = 4;
    setJob({ file, progress: p });
    const t = window.setInterval(() => {
      p = Math.min(100, p + 12);
      setJob({ file, progress: p });
      if (p >= 100) {
        clearInterval(t);
        timers.current.push(window.setTimeout(() => { setJob(null); done(); }, 300));
      }
    }, 350);
    timers.current.push(t);
  };

  const chooseFile = () => { if (!busy) pickRef.current?.querySelector<HTMLInputElement>('input[type=file]')?.click(); };
  const onFile = (f: File) => {
    const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
    if (!f.name.includes('.') || !ACCEPT.includes(ext)) {
      toast({ variant: 'error', title: 'Import database', message: `"${f.name}" is not a database backup. Choose a .bak, .zip, .sql, .mdf file.` });
      return;
    }
    run(f.name, () => {
      toast({ variant: 'success', title: 'Database imported', message: `${f.name} was restored into the Lepide database.` });
      setLast(`Last import: ${f.name} · ${formatDateTime(new Date())}`);
    });
  };
  const startExport = () => {
    if (busy) return;
    const d = new Date();
    const name = `LepideDB_Backup_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.bak`;
    run(name, () => {
      const at = new Date();
      saveBlob(new Blob([`Lepide Data Security Platform database backup\r\nCreated ${formatDateTime(at)}\r\n`], { type: 'application/octet-stream' }), name);
      toast({ variant: 'success', title: 'Database exported', message: `${name} was downloaded.` });
      setLast(`Last export: ${name} · ${formatDateTime(at)}`);
    });
  };

  return (
    <Card className="backup-restore-transfer">
      <div ref={pickRef} className={'backup-restore-drop' + (busy ? ' is-busy' : '')} aria-disabled={busy || undefined}>
        {imp ? (
          <FileUpload accept={ACCEPT.join(',')} onFile={onFile} label="Click here to upload your file!" rules={ACCEPT.join(', ')} />
        ) : (
          <div className="upload backup-restore-export">
            <button type="button" className="mhead__ic backup-restore-art" aria-label="Export the database" disabled={busy} onClick={startExport}>
              <Icon name="folder" />
            </button>
            <button type="button" className="backup-restore-cta" disabled={busy} onClick={startExport}>Click here to export your file!</button>
          </div>
        )}
      </div>
      <div className="backup-restore-run" aria-live="polite">
        {job ? (
          <div className="backup-restore-progress">
            <span className="text-sm">{imp ? `Importing ${job.file}…` : 'Exporting database…'}</span>
            <ProgressBar value={job.progress} label={imp ? 'Import progress' : 'Export progress'} />
          </div>
        ) : (
          <Button variant="primary" icon={imp ? 'upload' : 'download'} onClick={imp ? chooseFile : startExport}>
            {imp ? 'Import Database' : 'Export Database'}
          </Button>
        )}
        {last && !job && <p className="backup-restore-last">{last}</p>}
      </div>
    </Card>
  );
}
