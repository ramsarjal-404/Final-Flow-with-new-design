import { createStore } from './createStore';

/* ENT-SHARED-ExportRecord / ENT-SAD-ExportRecord (shared-data-model.md, shared-workflows.md § 4,
   settings-administration/data-model.md § 5). App-wide export-job store, persisted for the browser
   tab session in sessionStorage `lepide.exports`. Report views queue jobs with `queueExport`;
   Settings › Exported Files lists and manages them.

   Simulated lifecycle [Prototype-only]:
     queued → (1.4 s) running 10 % → +18 % every 0.65 s → completed (size set)
     every 4th attempt fails with "The export service did not respond before the timeout." (progress 0)
     failed → Retry → queued (file name kept: GAP-SAD-17 intended)
     remove() cancels the simulated job (GAP-SAD-20 intended)
     reload: queued / running jobs restart from queued. */

export type ExportFormat = 'CSV' | 'PDF';
export type ExportStatus = 'queued' | 'running' | 'completed' | 'failed';
export type ExportRecord = {
  id: string;
  reportId: string;
  reportName: string;
  format: ExportFormat;
  /** ISO date-time; re-stamped on retry. */
  requestedAt: string;
  status: ExportStatus;
  progress: number;
  size?: string;
  error?: string;
  filtersApplied: boolean;
  /** Display / download name fixed at request time (kept on retry, GAP-SAD-17 intended). */
  fileName: string;
};

type State = { records: ExportRecord[]; seq: number; attempts: number };

export const EXPORT_TIMEOUT_ERROR = 'The export service did not respond before the timeout.';

export const exportsStore = createStore<State>({ records: [], seq: 0, attempts: 0 }, { key: 'lepide.exports' });

/** `{report name without non-alphanumerics}_{unix seconds}.{csv|pdf}` */
export const exportFileName = (reportName: string, requestedAt: string, format: ExportFormat) =>
  `${reportName.replace(/[^A-Za-z0-9]+/g, '')}_${Math.floor(Date.parse(requestedAt) / 1000)}.${format.toLowerCase()}`;

/* ---------- simulated job runner ---------- */
const timers = new Map<string, number[]>();
const cancel = (id: string) => { (timers.get(id) ?? []).forEach((t) => { clearTimeout(t); clearInterval(t); }); timers.delete(id); };
const patch = (id: string, p: Partial<ExportRecord>) =>
  exportsStore.set((s) => ({ ...s, records: s.records.map((r) => (r.id === id ? { ...r, ...p } : r)) }));

function run(id: string) {
  cancel(id);
  const attempt = exportsStore.get().attempts + 1;
  exportsStore.set((s) => ({ ...s, attempts: attempt }));
  const fails = attempt % 4 === 0;
  const start = window.setTimeout(() => {
    if (!exportsStore.get().records.some((r) => r.id === id)) return cancel(id);
    patch(id, { status: 'running', progress: 10 });
    const tick = window.setInterval(() => {
      const rec = exportsStore.get().records.find((r) => r.id === id);
      if (!rec) return cancel(id);
      const next = rec.progress + 18;
      if (fails && next >= 64) {
        cancel(id);
        patch(id, { status: 'failed', progress: 0, error: EXPORT_TIMEOUT_ERROR });
      } else if (next >= 100) {
        cancel(id);
        patch(id, { status: 'completed', progress: 100, size: `${120 + Math.floor(Math.random() * 780)} KB` });
      } else {
        patch(id, { progress: next });
      }
    }, 650);
    timers.set(id, [...(timers.get(id) ?? []), tick]);
  }, 1400);
  timers.set(id, [start]);
}

/* ---------- public API ---------- */
export function queueExport(input: { reportId: string; reportName: string; format: ExportFormat; filtersApplied: boolean }): ExportRecord {
  const requestedAt = new Date().toISOString();
  const seq = exportsStore.get().seq + 1;
  const rec: ExportRecord = {
    ...input, id: `exp-${seq}`, requestedAt, status: 'queued', progress: 0,
    fileName: exportFileName(input.reportName, requestedAt, input.format),
  };
  exportsStore.set((s) => ({ ...s, seq, records: [rec, ...s.records] }));
  run(rec.id);
  return rec;
}

export function retryExport(id: string) {
  patch(id, { status: 'queued', progress: 0, error: undefined, size: undefined, requestedAt: new Date().toISOString() });
  run(id);
}

export function removeExport(id: string) {
  cancel(id);
  exportsStore.set((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) }));
}

/** Queued + running jobs (for a badge, GAP-SAD-16). */
export const activeExportCount = (s: State = exportsStore.get()) => s.records.filter((r) => r.status === 'queued' || r.status === 'running').length;
export const useExports = () => exportsStore.use((s) => s.records);
export const useActiveExportCount = () => exportsStore.use((s) => activeExportCount(s));

/* ---------- reload: in-flight jobs restart from queued ---------- */
(() => {
  const s = exportsStore.get();
  // Guard older / foreign persisted shapes.
  const records = Array.isArray(s.records) ? s.records.map((r) => ({ ...r, fileName: r.fileName ?? exportFileName(r.reportName, r.requestedAt, r.format) })) : [];
  const inflight = records.filter((r) => r.status === 'queued' || r.status === 'running').map((r) => r.id);
  exportsStore.set({
    records: records.map((r) => (inflight.includes(r.id) ? { ...r, status: 'queued' as const, progress: 0 } : r)),
    seq: typeof s.seq === 'number' ? s.seq : records.length,
    attempts: typeof s.attempts === 'number' ? s.attempts : 0,
  });
  if (typeof window !== 'undefined') inflight.forEach(run);
})();
