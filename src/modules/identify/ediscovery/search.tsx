import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, Drawer, IconButton, Menu, SelectField, TextField, useToast } from '../../../ui';
import { DOCUMENTS, edStore, emptyQuery, setQuery } from './store';
import type { Case, IndexedDocument, Operator, SearchQuery } from './store';
import { searchDocs, snippet, splitMatches } from './rules';
import { csvBlob, exportName, pdfBlob, saveBlob } from './exportFiles';
import type { ExportFormat } from './exportFiles';
import { BlockingDialog, KeyChips, fileArt } from './parts';

/* Shared by DLG-IDN-02 (side panel) and SCR-IDN-05 (expanded results). */

/** The case's stored query (or an empty one), the pending Find text and the INT-IDN-040…044/052 actions. */
export function useCaseQuery(c: Case) {
  const stored = edStore.use((s) => s.query);
  const q: SearchQuery = stored && stored.caseId === c.id ? stored : emptyQuery(c.id);
  const [find, setFind] = useState('');
  const toast = useToast();
  const err = (message: string) => toast({ variant: 'error', title: 'Searching Index', message });
  // Any edit marks the query as not run (results disappear until Search).
  const edit = (p: Partial<SearchQuery>) => setQuery({ ...q, ...p, ran: false });

  const addKey = (): string[] | null => {
    const k = find.trim();
    if (!k) { err('Type a keyword in Find, then click Add.'); return null; }
    if (k.length > 200) { err('Keywords are limited to 200 characters.'); return null; }
    if (q.keys.some((x) => x.toLowerCase() === k.toLowerCase())) { err(`"${k}" is already in Keys.`); return null; }
    const keys = [...q.keys, k];
    edit({ keys }); setFind('');
    return keys;
  };
  const run = () => {
    let keys = q.keys;
    if (find.trim()) { const r = addKey(); if (!r) return; keys = r; }
    if (!keys.length) { err('Add at least one keyword to search for.'); return; }
    if (keys.length > 1 && !q.operator) { err('Select an operator (AND / OR) to join the keywords.'); return; }
    setQuery({ ...q, keys, ran: true });
  };
  const results = useMemo(() => (q.ran ? searchDocs(DOCUMENTS, q) : null), [q]);
  return {
    q, find, setFind, results, run, addKey: () => { addKey(); },
    setOperator: (operator: Operator) => edit({ operator }),
    setExact: (exact: boolean) => edit({ exact }),
    removeKey: (k: string) => edit({ keys: q.keys.filter((x) => x !== k) }),
  };
}
export type CaseQuery = ReturnType<typeof useCaseQuery>;

/** Find / Add, Operator / Search, Match exact string, Keys. */
export function SearchControls({ s, layout }: { s: CaseQuery; layout: 'panel' | 'page' }) {
  return (
    <div className={'page-form identify-controls identify-controls--' + layout}>
      <div className="identify-pair">
        <TextField label="Find:" value={s.find} maxLength={200} onChange={s.setFind} className="grow"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); s.addKey(); } }} />
        <Button icon="plus" onClick={s.addKey}>Add</Button>
      </div>
      <div className="identify-pair">
        <SelectField label="Operator:" placeholder="Select Operator" options={['AND', 'OR']} value={s.q.operator} className="grow"
          onChange={(v) => s.setOperator(v as Operator)} />
        <Button icon="search" onClick={s.run}>Search</Button>
      </div>
      <div className="identify-controls__line">
        <Checkbox label="Match exact string" checked={s.q.exact} onChange={s.setExact} />
        <KeyChips label="Keys:" keys={s.q.keys} operator={s.q.operator} onRemove={s.removeKey} />
      </div>
    </div>
  );
}

/** Text with every key occurrence highlighted. */
export function Highlight({ text, q }: { text: string; q: Pick<SearchQuery, 'keys' | 'exact'> }) {
  return <>{splitMatches(text, q).map((p, i) => (p.hit ? <mark key={i} className="identify-mark">{p.t}</mark> : <span key={i}>{p.t}</span>))}</>;
}

/** One result: path heading (full path in the tooltip), Full screen action, highlighted snippet. */
export function ResultItem({ doc, q, onPreview }: { doc: IndexedDocument; q: SearchQuery; onPreview: (d: IndexedDocument) => void }) {
  return (
    <article className="identify-result">
      <header>
        <img src={fileArt(doc.path)} alt="" width={20} height={20} />
        <h4 title={doc.path}>{doc.path}</h4>
        <IconButton icon="eye" label={`Preview ${doc.path}`} data-tip="Full screen" onClick={() => onPreview(doc)} />
      </header>
      <p><Highlight text={snippet(doc.content, q)} q={q} /></p>
    </article>
  );
}

/* ---------- DLG-IDN-03 Document Preview (Lepide Design System: record drawer width, file strip, mono preview frame) ---------- */
export function DocumentPreview({ doc, q, onClose }: { doc: IndexedDocument | null; q: SearchQuery; onClose: () => void }) {
  if (!doc) return null;
  const parts = doc.path.split('\\');
  const name = parts.pop() || doc.path;
  return (
    <Drawer open onClose={onClose} title={doc.path} width="rec"
      head={<div className="identify-prev__head"><h3>{doc.path}</h3></div>}
      footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      <div className="basecard">
        <span className="basecard__ic"><img src={fileArt(doc.path)} alt="" width={20} height={20} /></span>
        <div className="basecard__text"><b>{name}</b><span>{parts.join('\\')}</span></div>
      </div>
      <div className="identify-frame">
        {doc.content.split('\n').map((p, i) => <p key={i}><Highlight text={p} q={q} /></p>)}
      </div>
    </Drawer>
  );
}

/* ---------- FLW-IDN-08 export (DLG-IDN-04) ---------- */
export function useExporter(caseName: string, q: SearchQuery, docs: IndexedDocument[]) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [skipContent, setSkipContent] = useState(true);
  const timer = useRef(0);
  const toast = useToast();
  useEffect(() => () => clearTimeout(timer.current), []);
  const start = (format: ExportFormat) => {
    if (!docs.length) { toast({ variant: 'error', title: 'Export', message: 'There are no results to export.' }); return; }
    setBusy(format);
    const input = { caseName, query: q, docs, withContent: !skipContent };
    timer.current = window.setTimeout(() => {
      saveBlob(format === 'CSV' ? csvBlob(input) : pdfBlob(input), exportName(caseName, format));
      setBusy(null);
      const n = docs.length;
      toast({ variant: 'success', title: 'Export ready', message: `${n} result${n === 1 ? '' : 's'} exported to ${format}${input.withContent ? ' with file content' : ''}.` });
    }, 1800);
  };
  const dialog = busy ? <BlockingDialog text={`Generating ${busy.toLowerCase()}. Please wait…`} /> : null;
  return { busy, skipContent, setSkipContent, start, dialog };
}
export type Exporter = ReturnType<typeof useExporter>;

/** "Do not export file content" + Export (menu "Export format": CSV / PDF). `reason` disables it with a tooltip. */
export function ExportTools({ ex, reason }: { ex: Exporter; reason?: string }) {
  const off = !!ex.busy || !!reason;
  return (
    <>
      <Checkbox label="Do not export file content" checked={ex.skipContent} onChange={ex.setSkipContent} />
      <Menu label="Export format" items={[{ label: 'CSV', icon: 'file', onSelect: () => ex.start('CSV') }, { label: 'PDF', icon: 'file', onSelect: () => ex.start('PDF') }]}
        trigger={(p) => (
          <span className="identify-tip" data-tip={off ? (ex.busy ? 'An export is being generated.' : reason) : undefined}>
            <IconButton icon="download" label="Export" bordered disabled={off} {...p} />
          </span>
        )} />
    </>
  );
}
