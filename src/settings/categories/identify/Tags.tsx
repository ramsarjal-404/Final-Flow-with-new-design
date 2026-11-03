import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button, ConfirmDialog, DataTable, DetailPanel, EmptyState, IconButton, KeyValues, SelectField, TextField, useToast,
} from '../../../ui';
import { deleteTag, idfStore, newId, plural, saveTag, sameName } from './store';
import type { IdfSource, Pattern, Tag } from './store';
import { Console, PickDrop, Tip } from './shared';

/* ---------- SCR-SDS-15 · Create Tags (Tag List) ---------- */
export function TagsPage({ source }: { source: IdfSource }) {
  const toast = useToast();
  const nav = useNavigate();
  const st = idfStore.use();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState<Tag | null>(null);
  const patName = (id: string) => st.patterns.find((p) => p.id === id)?.name;
  const patterns = (t: Tag) => t.patternIds.map(patName).filter(Boolean).join(', ');
  const cur = st.tags.find((t) => t.id === sel) ?? null;
  const usedIn = del ? st.templates.filter((t) => t.tagIds.includes(del.id)).length : 0;

  return (
    <Console source={source} title="Create Tags" crumbs={[{ label: 'Tag List' }]}
      actions={<Button variant="primary" icon="plus" onClick={() => nav(`/settings/identify/${source.id}/tags/new`)}>Create tag</Button>}>
      <div className={cur ? 'with-detail' : undefined}>
        <DataTable title="Tags" noun={['tag', 'tags']} rows={st.tags} rowKey={(t) => t.id}
          activeKey={sel} onRowOpen={(t) => setSel(t.id === sel ? null : t.id)}
          columns={[
            { key: 'name', header: 'Tag Name', sortable: true, filterable: true },
            { key: 'description', header: 'Description', sortable: true, filterable: true },
            { key: 'patterns', header: 'Patterns', sortable: true, filterable: true, value: patterns },
            { key: 'kind', header: 'Type', sortable: true, filterable: true },
          ]}
          rowActions={(t) => {
            const def = t.kind === 'Default';
            return <>
              <Tip tip={def ? 'Default tags cannot be deleted' : undefined}>
                <IconButton icon="trash" label={`Delete ${t.name}`} className="identify-danger-ic" disabled={def} onClick={() => setDel(t)} />
              </Tip>
              <Tip tip={def ? 'Default tags cannot be edited' : undefined}>
                <IconButton icon="edit" label={`Edit ${t.name}`} disabled={def} onClick={() => nav(`/settings/identify/${source.id}/tags/${t.id}`)} />
              </Tip>
            </>;
          }}
          empty={<EmptyState icon="tag" title="No tags yet. Click Create Tag to add one." />} />
        {cur && (
          <DetailPanel title="Tag Information" subtitle={cur.name} onClose={() => setSel(null)}>
            <KeyValues items={[
              { label: 'Name', value: cur.name, wide: true },
              { label: 'Description', value: cur.description, wide: true },
              { label: 'Type', value: cur.kind },
              { label: 'Pattern', value: patterns(cur) },
            ]} />
          </DetailPanel>
        )}
      </div>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete tag?" confirmLabel="Delete"
        message={del ? `"${del.name}" will be deleted${usedIn ? ` and removed from ${plural(usedIn, 'template')}` : ''}.` : undefined}
        onConfirm={() => {
          if (!del) return;
          deleteTag(del.id); if (sel === del.id) setSel(null);
          toast({ variant: 'success', title: 'Tag deleted', message: `${del.name} was deleted.` });
          setDel(null);
        }} />
    </Console>
  );
}

/* ---------- SCR-SDS-16 · Create Tag / Edit Tag ---------- */
export function TagEditor({ source }: { source: IdfSource }) {
  const toast = useToast();
  const nav = useNavigate();
  const { id } = useParams();
  const st = idfStore.use();
  const existing = st.tags.find((t) => t.id === id) ?? null;
  const edit = !!existing;
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [filter, setFilter] = useState('All');
  const [chosen, setChosen] = useState<string[]>(existing?.patternIds ?? []);
  const [checked, setChecked] = useState<string[]>([]);
  const [errs, setErrs] = useState<{ name?: string; patterns?: string }>({});
  const [leave, setLeave] = useState(false);
  const list = `/settings/identify/${source.id}/tags`;
  const title = edit ? 'Edit Tag' : 'Create tag';
  const rows = filter === 'All' ? st.patterns : st.patterns.filter((p) => p.kind === filter);

  const ok = () => {
    const n = name.trim();
    let e: { name?: string; patterns?: string } = {};
    if (!n) e = { name: 'Enter the tag name.' };
    else if (st.tags.some((t) => t.id !== existing?.id && sameName(t.name, n))) e = { name: `A tag named "${n}" already exists.` };
    else if (chosen.length === 0) e = { patterns: 'Drag at least one pattern into the box on the right.' };
    if (e.name || e.patterns) { setErrs(e); toast({ variant: 'error', title: 'Check the highlighted fields', message: (e.name ?? e.patterns)! }); return; }
    saveTag({ id: existing?.id ?? newId('t'), name: n, description: description.trim(), patternIds: chosen, kind: 'Custom' });
    toast({ variant: 'success', title: edit ? 'Tag updated' : 'Tag created', message: `${n} matches ${chosen.length} pattern(s).` });
    nav(list);
  };

  return (
    <Console source={source} rail={false} title={title} crumbs={[{ label: 'Tag', to: list }, { label: title }]}
      actions={<>
        <IconButton icon="refresh" label="Refresh" bordered onClick={() => setChecked([])} />
        <Button variant="danger" icon="trash" onClick={() => setChosen([])}>Delete all</Button>
        <Button icon="plus" onClick={() => setLeave(true)}>Create patterns</Button>
      </>}>
      <section className="lf-card set-card page-form">
        <div className="set-card__body">
          <div className="fld-row">
            <TextField label="Tag Name" note="Required" value={name} error={errs.name} maxLength={100} placeholder="Enter tag name"
              onChange={(v) => { setName(v); setErrs({}); }} />
            <TextField label="Description" value={description} maxLength={200} placeholder="Enter description" onChange={setDescription} />
          </div>
          <div className="fld-row">
            <SelectField label="Select Tag" options={['All', 'Default', 'Custom']} value={filter} onChange={setFilter} />
          </div>
          <PickDrop<Pattern> rows={rows} rowKey={(p) => p.id} rowName={(p) => p.name} noun="patterns" container="tag"
            leftTitle="Patterns" rightTitle="Tag Patterns" dropText="Drag And Drop Patterns To Create Tag"
            checked={checked} onChecked={setChecked} chosen={chosen.filter((c) => st.patterns.some((p) => p.id === c))}
            onChosen={(ids) => { setChosen(ids); setErrs({}); }}
            left={[
              { key: 'name', header: 'Pattern', value: (p) => p.name },
              { key: 'type', header: 'Type', value: (p) => p.type },
              { key: 'expr', header: 'Expression', value: (p) => `${p.kind} Pattern` },
            ]}
            right={[
              { key: 'name', header: 'Pattern Type', value: (p) => p.name },
              { key: 'kind', header: 'Type', value: (p) => p.kind },
            ]} />
          {errs.patterns && <small className="fld__err" role="alert">{errs.patterns}</small>}
        </div>
        <footer className="set-card__foot">
          <Button onClick={() => nav(list)}>Cancel</Button>
          <Button icon="chevron-left" onClick={() => nav(list)}>Back</Button>
          <Button variant="primary" onClick={ok}>Ok</Button>
        </footer>
      </section>
      <ConfirmDialog open={leave} onClose={() => setLeave(false)} destructive={false} icon="info" title="Leave this tag?"
        message="Creating a pattern opens the Create Patterns page. This unsaved tag will be discarded." confirmLabel="Create Pattern"
        onConfirm={() => { setLeave(false); nav(`/settings/identify/${source.id}/patterns/new`); }} />
    </Console>
  );
}
