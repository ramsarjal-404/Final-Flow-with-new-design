import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button, ConfirmDialog, DataTable, DetailPanel, EmptyState, IconButton, KeyValues, SelectField, TextField, useToast,
} from '../../../ui';
import { deleteTemplate, idfStore, newId, plural, saveTemplate, sameName } from './store';
import type { IdfSource, Tag } from './store';
import { Console, PickDrop, SearchBox } from './shared';

/* ---------- SCR-SDS-13 · Template Modification ---------- */
export function TemplatesPage({ source }: { source: IdfSource }) {
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const st = idfStore.use();
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(() => (loc.state as { select?: string } | null)?.select ?? st.templates[0]?.id ?? null);
  const [tagSel, setTagSel] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const tpl = st.templates.find((t) => t.id === selId) ?? null;
  useEffect(() => { if (!tpl && st.templates[0]) setSelId(st.templates[0].id); }, [tpl, st.templates]);
  const list = st.templates.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()));
  const tags = tpl ? tpl.tagIds.map((id) => st.tags.find((t) => t.id === id)).filter(Boolean) as Tag[] : [];
  const patName = (id: string) => st.patterns.find((p) => p.id === id)?.name;
  const curTag = tags.find((t) => t.id === tagSel) ?? null;
  const custom = tpl?.kind === 'Custom';
  const usedBy = tpl ? st.profiles.filter((p) => p.templateIds.includes(tpl.id)).length : 0;

  return (
    <Console source={source} title="Template modification" crumbs={[{ label: 'Templates' }]}
      actions={<>
        <Button icon="edit" disabled={!custom} onClick={() => tpl && nav(`/settings/identify/${source.id}/templates/${tpl.id}`)}>Edit template</Button>
        <Button variant="danger" icon="trash" disabled={!custom} onClick={() => setDel(true)}>Delete template</Button>
        <Button variant="primary" icon="plus" onClick={() => nav(`/settings/identify/${source.id}/templates/new`)}>Create template</Button>
      </>}>
      <div className="identify-split">
        <section className="lf-card folders identify-side" aria-label="Templates">
          <SearchBox value={q} onChange={setQ} ariaLabel="Search templates" />
          {list.length === 0 ? <p className="muted identify-side__empty">No templates match.</p> : (
            <ul className="tree" role="listbox" aria-label="Templates">
              {list.map((t) => (
                <li key={t.id}>
                  <button type="button" role="option" aria-selected={t.id === selId} aria-current={t.id === selId ? 'true' : undefined}
                    onClick={() => { setSelId(t.id); setTagSel(null); }}>
                    <span>{t.name}</span><span className="n">{t.tagIds.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className={curTag ? 'with-detail' : undefined}>
          <DataTable title={tpl?.name ?? 'Tags'} noun={['tag', 'tags']} rows={tags} rowKey={(t) => t.id}
            activeKey={tagSel} onRowOpen={(t) => setTagSel(t.id === tagSel ? null : t.id)}
            columns={[
              { key: 'name', header: 'Tag name', sortable: true, filterable: true },
              { key: 'description', header: 'Description', sortable: true, filterable: true },
              { key: 'patterns', header: 'Patterns', sortable: true, filterable: true, value: (t) => t.patternIds.map(patName).filter(Boolean).join(', ') },
              { key: 'kind', header: 'Type', sortable: true, filterable: true },
            ]}
            empty={<EmptyState compact icon="folder" title="This template has no tags yet." />} />
          {curTag && (
            <DetailPanel title="Template information" subtitle={curTag.name} onClose={() => setTagSel(null)}>
              <KeyValues items={[
                { label: 'Name', value: curTag.name, wide: true },
                { label: 'Description', value: curTag.description, wide: true },
                { label: 'Type', value: curTag.kind },
                { label: 'Pattern', value: curTag.patternIds.map(patName).filter(Boolean).join(', ') },
              ]} />
            </DetailPanel>
          )}
        </div>
      </div>
      <ConfirmDialog open={del && !!tpl} onClose={() => setDel(false)} title="Delete template?" confirmLabel="Delete"
        message={tpl ? `"${tpl.name}" will be deleted.${usedBy ? ` It is used by ${plural(usedBy, 'profile')}.` : ''}` : undefined}
        onConfirm={() => {
          if (!tpl) return;
          deleteTemplate(tpl.id);
          const rest = idfStore.get().templates;
          setSelId(rest[0]?.id ?? null); setTagSel(null); setDel(false);
          toast({ variant: 'success', title: 'Template deleted', message: `${tpl.name} was deleted.` });
        }} />
    </Console>
  );
}

/* ---------- SCR-SDS-14 · Create Template / Edit Template ---------- */
export function TemplateEditor({ source }: { source: IdfSource }) {
  const toast = useToast();
  const nav = useNavigate();
  const { id } = useParams();
  const st = idfStore.use();
  const existing = st.templates.find((t) => t.id === id) ?? null;
  const edit = !!existing;
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [option, setOption] = useState('Select From Existing Tag');
  const [from, setFrom] = useState('');
  const [chosen, setChosen] = useState<string[]>(existing?.tagIds ?? []);
  const [checked, setChecked] = useState<string[]>([]);
  const [errs, setErrs] = useState<{ name?: string; tags?: string }>({});
  const [leave, setLeave] = useState(false);
  const list = `/settings/identify/${source.id}/templates`;
  const title = edit ? 'Edit template' : 'Create template';

  const fromTpl = st.templates.find((t) => t.id === from);
  const rows = option === 'Import From Template' && fromTpl ? st.tags.filter((t) => fromTpl.tagIds.includes(t.id)) : st.tags;
  const firstTpl = (tagId: string) => st.templates.find((t) => t.tagIds.includes(tagId))?.name ?? '';

  const ok = () => {
    const n = name.trim();
    let e: { name?: string; tags?: string } = {};
    if (!n) e = { name: 'Enter the template name.' };
    else if (st.templates.some((t) => t.id !== existing?.id && sameName(t.name, n))) e = { name: `A template named "${n}" already exists.` };
    else if (chosen.length === 0) e = { tags: 'Drag at least one tag into the box on the right.' };
    if (e.name || e.tags) { setErrs(e); toast({ variant: 'error', title: 'Check the highlighted fields', message: (e.name ?? e.tags)! }); return; }
    const tid = existing?.id ?? newId('tp');
    saveTemplate({ id: tid, name: n, description: description.trim(), tagIds: chosen, kind: 'Custom' });
    toast({ variant: 'success', title: edit ? 'Template updated' : 'Template created', message: `${n} has ${chosen.length} tag(s).` });
    nav(list, { state: { select: tid } });
  };

  return (
    <Console source={source} rail={false} title={title} crumbs={[{ label: 'Templates', to: list }, { label: title }]}
      actions={<>
        <IconButton icon="refresh" label="Refresh" bordered onClick={() => setChecked([])} />
        <Button variant="danger" icon="trash" onClick={() => setChosen([])}>Delete all</Button>
        <Button icon="plus" onClick={() => setLeave(true)}>Create custom tag</Button>
      </>}>
      <section className="lf-card set-card page-form">
        <div className="set-card__body">
          <div className="fld-row">
            <TextField label="Templates name" note="Required" value={name} error={errs.name} maxLength={100} placeholder="Enter template name"
              onChange={(v) => { setName(v); setErrs({}); }} />
            <TextField label="Description" value={description} maxLength={200} placeholder="Enter description" onChange={setDescription} />
          </div>
          <div className="fld-row">
            <SelectField label="Select options" options={['Select From Existing Tag', 'Import From Template']} value={option}
              onChange={(v) => { setOption(v); setFrom(''); }} />
            {option === 'Import From Template' && (
              <SelectField label="Select template" placeholder="Select" value={from} onChange={setFrom}
                options={st.templates.filter((t) => t.id !== existing?.id).map((t) => ({ value: t.id, label: t.name }))} />
            )}
          </div>
          <PickDrop<Tag> rows={rows} rowKey={(t) => t.id} rowName={(t) => t.name} noun="tags" container="template"
            leftTitle="Tags" rightTitle="Template Tags" dropText="Drag And Drop Tags To Create Template"
            checked={checked} onChecked={setChecked} chosen={chosen.filter((c) => st.tags.some((t) => t.id === c))}
            onChosen={(ids) => { setChosen(ids); setErrs({}); }}
            left={[
              { key: 'name', header: 'Tag name', value: (t) => t.name },
              { key: 'kind', header: 'Type', value: (t) => t.kind },
              { key: 'tpl', header: 'Template', value: (t) => firstTpl(t.id) },
              { key: 'description', header: 'Description', value: (t) => t.description },
            ]}
            right={[
              { key: 'name', header: 'Tag name', value: (t) => t.name },
              { key: 'kind', header: 'Type', value: (t) => t.kind },
              { key: 'description', header: 'Description', value: (t) => t.description },
            ]} />
          {errs.tags && <small className="fld__err" role="alert">{errs.tags}</small>}
        </div>
        <footer className="set-card__foot">
          <Button onClick={() => nav(list)}>Cancel</Button>
          <Button icon="chevron-left" onClick={() => nav(list)}>Back</Button>
          <Button variant="primary" onClick={ok}>Ok</Button>
        </footer>
      </section>
      <ConfirmDialog open={leave} onClose={() => setLeave(false)} destructive={false} icon="info" title="Leave this template?"
        message="Creating a custom tag opens the Create Tag page. This unsaved template will be discarded." confirmLabel="Create tag"
        onConfirm={() => { setLeave(false); nav(`/settings/identify/${source.id}/tags/new`); }} />
    </Console>
  );
}
