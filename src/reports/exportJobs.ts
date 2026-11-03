import { exportsStore, queueExport, type ExportFormat, type ExportRecord } from '../stores/exports';
import type { ToastInput } from '../ui';
import { saveBlob } from './files';

/* Export as a background job (GAP-RLIB-05 intended, shared-workflows.md § 4). The view queues an
   ExportRecord with `queueExport` (listed under Settings › Exported Files) and the real file is
   downloaded only as the completion step of that job — here, as soon as the job completes, or later
   when a failed job is retried from Exported Files and completes. */

type Pending = { build: () => Blob; fileName: string; done: ToastInput; failTitle: string; failedNotified?: boolean };
const pending = new Map<string, Pending>();
let toaster: ((t: ToastInput) => void) | null = null;

/** Register the app toast function (called by every report route; the last one wins). */
export const setExportToaster = (fn: (t: ToastInput) => void) => { toaster = fn; };

exportsStore.subscribe(() => {
  if (!pending.size) return;
  const recs = exportsStore.get().records;
  for (const [id, p] of pending) {
    const r = recs.find((x) => x.id === id);
    if (!r) { pending.delete(id); continue; }
    if (r.status === 'completed') {
      pending.delete(id);
      try { saveBlob(p.build(), p.fileName); } catch { /* ignore */ }
      toaster?.(p.done);
    } else if (r.status === 'failed' && !p.failedNotified) {
      p.failedNotified = true;
      toaster?.({ variant: 'error', title: p.failTitle, message: `${r.error ?? 'The export failed.'} Retry it from Settings › Exported Files.` });
    } else if (r.status !== 'failed') p.failedNotified = false;
  }
});

/** Queue the export job and remember how to build the file when it completes. */
export function queueReportExport(input: {
  reportId: string; reportName: string; format: ExportFormat; filtersApplied: boolean;
  fileName: string; build: () => Blob; done: ToastInput; failTitle: string;
}): ExportRecord {
  const rec = queueExport({ reportId: input.reportId, reportName: input.reportName, format: input.format, filtersApplied: input.filtersApplied });
  pending.set(rec.id, { build: input.build, fileName: input.fileName, done: input.done, failTitle: input.failTitle });
  return rec;
}
