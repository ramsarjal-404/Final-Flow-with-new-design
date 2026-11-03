import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, Checkbox, ConfirmDialog, DataTable, DetailPanel, EmptyState, Field, IconButton, KeyValues, SelectField, TextAreaField, TextField, useToast,
} from '../../../ui';
import { deletePattern, idfStore, newId, plural, savePattern, sameName } from './store';
import type { IdfSource, Pattern } from './store';
import { Console, Tip } from './shared';

/* ---------- SCR-SDS-17 · Create Pattern (Pattern List) ---------- */
export function PatternsPage({ source }: { source: IdfSource }) {
  const toast = useToast();
  const nav = useNavigate();
  const st = idfStore.use();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState<Pattern | null>(null);
  const cur = st.patterns.find((p) => p.id === sel) ?? null;
  const usedIn = del ? st.tags.filter((t) => t.patternIds.includes(del.id)).length : 0;

  return (
    <Console source={source} title="Create Pattern" crumbs={[{ label: 'Pattern List' }]}
      actions={<Button variant="primary" icon="plus" onClick={() => nav(`/settings/identify/${source.id}/patterns/new`)}>Create patterns</Button>}>
      <div className={cur ? 'with-detail' : undefined}>
        <DataTable title="Patterns" noun={['pattern', 'patterns']} rows={st.patterns} rowKey={(p) => p.id}
          activeKey={sel} onRowOpen={(p) => setSel(p.id === sel ? null : p.id)}
          columns={[
            { key: 'name', header: 'Pattern Name', sortable: true, filterable: true },
            { key: 'type', header: 'Type', sortable: true, filterable: true },
            { key: 'description', header: 'Description', sortable: true, filterable: true },
            { key: 'expression', header: 'Expressions', sortable: true, filterable: true, render: (p) => <code className="identify-code">{p.expression}</code> },
            { key: 'kind', header: 'Pattern Type', sortable: true, filterable: true },
          ]}
          rowActions={(p) => {
            const def = p.kind === 'Default';
            return <>
              <Tip tip={def ? 'Default patterns cannot be deleted' : undefined}>
                <IconButton icon="trash" label={`Delete ${p.name}`} className="identify-danger-ic" disabled={def} onClick={() => setDel(p)} />
              </Tip>
              <Tip tip={def ? 'Default patterns cannot be edited' : undefined}>
                <IconButton icon="edit" label={`Edit ${p.name}`} disabled={def} onClick={() => nav(`/settings/identify/${source.id}/patterns/${p.id}`)} />
              </Tip>
            </>;
          }}
          empty={<EmptyState icon="search" title="No patterns yet. Click Create Patterns to add one." />} />
        {cur && (
          <DetailPanel title="Pattern Information" subtitle={cur.name} onClose={() => setSel(null)}>
            <KeyValues items={[
              { label: 'Name', value: cur.name, wide: true },
              { label: 'Description', value: cur.description, wide: true },
              { label: 'Type', value: `${cur.type} (${cur.kind})`, wide: true },
              { label: 'Expression', value: <code className="identify-code">{cur.expression}</code>, wide: true },
              { label: 'Risk Level', value: cur.riskLevel },
              { label: 'Monetary Value', value: cur.monetaryValue },
            ]} />
          </DetailPanel>
        )}
      </div>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete pattern?" confirmLabel="Delete"
        message={del ? `"${del.name}" will be deleted${usedIn ? ` and removed from ${plural(usedIn, 'tag')}` : ''}.` : undefined}
        onConfirm={() => {
          if (!del) return;
          deletePattern(del.id); if (sel === del.id) setSel(null);
          toast({ variant: 'success', title: 'Pattern deleted', message: `${del.name} was deleted.` });
          setDel(null);
        }} />
    </Console>
  );
}

/* ---------- SCR-SDS-18 · Create Patterns / Edit Patterns ---------- */
type Form = Omit<Pattern, 'id' | 'kind'>;
const validRegex = (s: string) => { try { new RegExp(s); return true; } catch { return false; } };

function patternErrors(f: Form, others: Pattern[]): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  const n = f.name.trim();
  if (!n) e.name = 'Enter the pattern name.';
  else if (others.some((p) => sameName(p.name, n))) e.name = `A pattern named "${n}" already exists.`;
  if (!f.expression.trim()) e.expression = f.type === 'Regular Expression' ? 'Enter the regular expression.' : 'Enter the string to match.';
  else if (f.type === 'Regular Expression' && !validRegex(f.expression)) e.expression = 'The regular expression is not valid.';
  const r = Number(f.riskLevel);
  if (!/^\d+$/.test(f.riskLevel.trim()) || r < 1 || r > 100) e.riskLevel = 'Risk level must be a number from 1 to 100.';
  if (!/^\d+(\.\d+)?$/.test(f.monetaryValue.trim())) e.monetaryValue = 'Monetary value must be a number.';
  if (f.evidence) {
    if (!f.keywords.trim() && !f.regexInclude.trim()) e.keywords = 'Enter keywords or a regex to include as supporting evidence.';
    else if (f.regexInclude.split(',').map((x) => x.trim()).filter(Boolean).some((x) => !validRegex(x))) e.regexInclude = 'One of the regex to include values is not valid.';
    if (f.proximity.trim() && !/^\d+$/.test(f.proximity.trim())) e.proximity = 'Proximity must be a whole number of characters.';
  }
  return e;
}
const ORDER: (keyof Form)[] = ['name', 'expression', 'riskLevel', 'monetaryValue', 'keywords', 'regexInclude', 'proximity'];

export function PatternEditor({ source }: { source: IdfSource }) {
  const toast = useToast();
  const nav = useNavigate();
  const { id } = useParams();
  const st = idfStore.use();
  const existing = st.patterns.find((p) => p.id === id) ?? null;
  const edit = !!existing;
  const [f, setF] = useState<Form>(() => existing ? { ...existing } : {
    name: '', type: 'Regular Expression', description: '', expression: '', riskLevel: '50', monetaryValue: '100',
    evidence: false, keywords: '', regexInclude: '', keywordsExclude: '', proximity: '',
  });
  const [tried, setTried] = useState(false);
  const list = `/settings/identify/${source.id}/patterns`;
  const title = edit ? 'Edit Patterns' : 'Create patterns';
  const others = st.patterns.filter((p) => p.id !== existing?.id);
  const errs = tried ? patternErrors(f, others) : {};
  const up = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  const apply = () => {
    const e = patternErrors(f, others);
    const first = ORDER.find((k) => e[k]);
    if (first) { setTried(true); toast({ variant: 'error', title: 'Check the highlighted fields', message: e[first]! }); return; }
    const p: Pattern = { ...f, name: f.name.trim(), id: existing?.id ?? newId('p'), kind: 'Custom' };
    savePattern(p);
    toast({ variant: 'success', title: edit ? 'Pattern updated' : 'Pattern created', message: `${p.name} is ready to use in tags.` });
    nav(list);
  };

  return (
    <Console source={source} rail={false} title={title} crumbs={[{ label: 'Pattern', to: list }, { label: title }]}>
      <section className="lf-card set-card page-form">
        <div className="set-card__body">
          <div className="form-col">
            <div className="fld-row">
              <TextField label="Pattern Name" value={f.name} error={errs.name} maxLength={100} placeholder="Enter pattern name" onChange={(v) => up({ name: v })} />
              <SelectField label="Type" options={['Regular Expression', 'String']} value={f.type} onChange={(v) => up({ type: v as Form['type'] })} />
            </div>
            <TextField label="Description" value={f.description} maxLength={200} placeholder="Enter description" onChange={(v) => up({ description: v })} />
            <TextAreaField label="Regex/String" value={f.expression} error={errs.expression} maxLength={1000} className="identify-mono-field"
              placeholder={f.type === 'Regular Expression' ? '\\b[0-9]{9}\\b' : 'Text to match'} onChange={(v) => up({ expression: v })} />
            <div className="fld-row">
              <TextField label="Risk Level" value={f.riskLevel} error={errs.riskLevel} inputMode="numeric" maxLength={3}
                onChange={(v) => up({ riskLevel: v.replace(/\D/g, '') })} />
              <TextField label="Monetary Value" value={f.monetaryValue} error={errs.monetaryValue} inputMode="decimal" maxLength={12}
                onChange={(v) => { if (/^\d*\.?\d*$/.test(v)) up({ monetaryValue: v }); }} />
            </div>
            <Checkbox label="Supporting Evidence" checked={f.evidence} onChange={(v) => up({ evidence: v })} />
            <div className="fld-row">
              <TextField label="Keyword(s)" value={f.keywords} disabled={!f.evidence} error={f.evidence ? errs.keywords : undefined}
                help={'Separate multiple value by ","'} onChange={(v) => up({ keywords: v })} />
              <TextField label="Regex to include" value={f.regexInclude} disabled={!f.evidence} error={f.evidence ? errs.regexInclude : undefined}
                help={'Separate multiple value by ","'} onChange={(v) => up({ regexInclude: v })} />
            </div>
            <div className="fld-row">
              <TextField label="Keyword(s) to exclude" value={f.keywordsExclude} disabled={!f.evidence}
                help={'Separate multiple value by ","'} onChange={(v) => up({ keywordsExclude: v })} />
              <Field label="Proximity" error={f.evidence ? errs.proximity : undefined}>
                <div className="identify-unit">
                  <input aria-label="Proximity" value={f.proximity} disabled={!f.evidence} inputMode="numeric" maxLength={6}
                    onChange={(e) => up({ proximity: e.target.value })} />
                  <span className="muted text-sm">Characters</span>
                </div>
              </Field>
            </div>
          </div>
        </div>
        <footer className="set-card__foot">
          <Button onClick={() => nav(list)}>Cancel</Button>
          <Button icon="chevron-left" onClick={() => nav(list)}>Back</Button>
          <Button variant="primary" onClick={apply}>Apply</Button>
        </footer>
      </section>
    </Console>
  );
}
