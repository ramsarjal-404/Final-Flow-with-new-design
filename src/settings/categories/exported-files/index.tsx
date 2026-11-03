import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Chip, ConfirmDialog, DataTable, EmptyState, Icon, IconButton, ProgressBar, ToneTag, useToast,
} from '../../../ui';
import type { Column } from '../../../ui';
import { formatDateTime } from '../../../stores/admin';
import { removeExport, retryExport, useExports } from '../../../stores/exports';
import { SUB, deleteSeedExport, startSeedClock, subStore } from '../../../stores/subscription';
import { fileFor, saveBlob } from './download';
import './styles.css';

/* SCR-SAD-09 Exported Files + DLG-SAD-21 Delete exported file.
   Cards come from the shared export store (newest first) and the four seeded jobs
   (ENT-SAD-SeedExportJob), grouped In Progress · Failed · Completed. Lepide Design System: BackgroundJobPattern —
   one table card per section, status as ToneTag + ProgressBar. */

type JobState = 'progress' | 'completed' | 'failed';
type JobCard = {
  key: string; id: string; source: 'store' | 'seed'; name: string; report: string; ext: string;
  state: JobState; progress: number; size?: string; error?: string;
};

const SEEDS = SUB.SEED_EXPORTED_FILES;
const extOf = (name: string) => (name.split('.').pop() ?? '').toUpperCase();

export default function ExportedFilesPage() {
  const toast = useToast();
  const records = useExports();
  const clock = subStore.use((s) => s.seedClockStart);
  const deleted = subStore.use((s) => s.deletedSeeds);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState<JobCard | null>(null);

  useEffect(() => { startSeedClock(); }, []);

  const cards = useMemo<JobCard[]>(() => {
    const fromStore: JobCard[] = records.map((r) => ({
      key: 'r:' + r.id, id: r.id, source: 'store', name: r.fileName, report: r.reportName, ext: r.format,
      state: r.status === 'completed' ? 'completed' : r.status === 'failed' ? 'failed' : 'progress',
      progress: r.status === 'completed' ? 100 : r.status === 'queued' || r.status === 'failed' ? 0 : r.progress,
      size: r.size, error: r.error,
    }));
    const elapsed = clock === null ? 0 : Math.max(0, Math.floor((now - clock) / 1000));
    const fromSeeds: JobCard[] = SEEDS.filter((s) => !deleted.includes(s.id)).map((s) => {
      const p = Math.min(100, s.start + elapsed * s.rate);
      return {
        key: 's:' + s.id, id: s.id, source: 'seed', name: s.name, report: s.name.replace(/\.[^.]+$/, ''), ext: extOf(s.name),
        state: p >= 100 ? 'completed' : 'progress', progress: p, size: `${240 + s.start * 7} KB`,
      };
    });
    return [...fromStore, ...fromSeeds];
  }, [records, clock, deleted, now]);

  // Seed progress re-renders every second while any seed is in progress.
  const seedsRunning = cards.some((c) => c.source === 'seed' && c.state === 'progress');
  useEffect(() => {
    if (!seedsRunning) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [seedsRunning]);

  // INT-SAD-237: a card that was not complete while the page was open completes → one toast.
  const watching = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (watching.current === null) { watching.current = new Set(cards.filter((c) => c.state !== 'completed').map((c) => c.key)); return; }
    const done: string[] = [];
    for (const c of cards) {
      if (c.state !== 'completed') watching.current.add(c.key);
      else if (watching.current.has(c.key)) { watching.current.delete(c.key); done.push(c.name); }
    }
    if (done.length) toast({ variant: 'success', title: 'Export completed', message: `${done.join(', ')} is ready to download.` });
  }, [cards, toast]);

  const download = (c: JobCard) => {
    if (c.state === 'completed') {
      saveBlob(fileFor(c.name, c.report, formatDateTime(new Date())), c.name);
      toast({ variant: 'success', title: 'Download started', message: c.name });
    } else if (c.state === 'failed') {
      toast({ variant: 'error', title: 'Export failed', message: 'Retry the export before downloading it.' });
    } else {
      toast({ variant: 'info', title: 'Still preparing', message: `${c.name} is ${Math.round(c.progress)}% done. Download is available once it completes.` });
    }
  };
  const retry = (c: JobCard) => {
    retryExport(c.id);
    toast({ variant: 'info', title: 'Export queued again', message: c.name });
  };
  const confirmDelete = () => {
    if (!pending) return;
    if (pending.source === 'store') removeExport(pending.id); else deleteSeedExport(pending.id);
    toast({ variant: 'success', title: 'File deleted', message: `${pending.name} was removed.` });
    setPending(null);
  };

  const columns: Column<JobCard>[] = [
    {
      key: 'name', header: 'File Name', sortable: true, minWidth: 260, value: (c) => c.name,
      render: (c) => (
        <span className="exported-files-name" title={c.name}>
          <span className="exported-files-glyph" aria-hidden="true"><Icon name="file" size={15} /></span>
          <span className="exported-files-name__text">{c.name}</span>
        </span>
      ),
    },
    { key: 'ext', header: 'Format', width: 96, value: (c) => c.ext, render: (c) => <Chip tone="flat">{c.ext}</Chip> },
    {
      key: 'state', header: 'Status', minWidth: 240, wrap: true, value: (c) => c.progress,
      render: (c) => {
        if (c.state === 'completed') return <ToneTag tone="good">Completed{c.size ? ` · ${c.size}` : ''}</ToneTag>;
        if (c.state === 'failed') {
          return (
            <span className="exported-files-status">
              <ToneTag tone="bad">Failed</ToneTag>
              <span className="exported-files-err">{c.error || 'The export did not complete.'}</span>
            </span>
          );
        }
        return c.progress <= 0 ? (
          <span className="exported-files-status">
            <ProgressBar indeterminate label={`${c.name} progress`} />
            <span className="exported-files-queued">Queued…</span>
          </span>
        ) : <ProgressBar value={Math.max(2, c.progress)} label={`${c.name} progress`} />;
      },
    },
    {
      key: 'actions', header: 'Actions', width: 180, align: 'right',
      render: (c) => (
        <span className="row row--end">
          {c.state === 'failed' && c.source === 'store' && <Button size="sm" icon="refresh" onClick={() => retry(c)}>Retry</Button>}
          <IconButton icon="trash" label={`Delete ${c.name}`} data-tip="Delete" danger onClick={() => setPending(c)} />
          <IconButton icon="download" label={`Download ${c.name}`} data-tip="Download" onClick={() => download(c)} />
        </span>
      ),
    },
  ];

  const sections: { title: string; state: JobState }[] = [
    { title: 'In Progress', state: 'progress' }, { title: 'Failed', state: 'failed' }, { title: 'Completed', state: 'completed' },
  ];

  return (
    <>
      {cards.length === 0 ? (
        <section className="lf-card tablecard" style={{ minHeight: 360 }}>
          <EmptyState icon="download" title="Sorry, no exported file to download!" />
        </section>
      ) : sections.map((s) => {
        const rows = cards.filter((c) => c.state === s.state);
        if (!rows.length) return null;
        return (
          <DataTable key={s.state} className="exported-files-table" title={s.title} noun={['file', 'files']} columns={columns} rows={rows}
            rowKey={(c) => c.key} />
        );
      })}
      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} onConfirm={confirmDelete} title="Delete exported file" confirmLabel="Delete"
        message={pending ? (pending.state === 'progress'
          ? `Delete "${pending.name}"? The export is cancelled. This can't be undone.`
          : `Delete "${pending.name}"? This can't be undone.`) : undefined} />
    </>
  );
}
