/* AI Shield › Protection policy (/shield/policy): risk and action legend, one card per policy, the policy editor drawer
   and the "Publish version" bar. Edits go to a draft on this page; publishing makes them the next version. */
import { useState } from 'react';
import { Button, Checkbox, Chip, Drawer, Dropdown, Icon, RadioGroup, SelectField, useToast, type IconName } from '../../ui';
import { ACTIONS, actionOf, RISKS, UNITS } from './data';
import { keywordCount, publishPolicy, shieldStore } from './store';
import { ago, RiskChip, ShieldPage } from './parts';
import type { PolicyAction, ProtectionPolicy, Risk, Unit } from './types';

/** Cards show the first few keywords; the rest open with "+N more". */
const KEYWORDS_SHOWN = 5;

const unitsLabel = (units: Unit[]) =>
  units.length === 0 ? 'No units' : units.length === UNITS.length ? 'All units' : units.length === 1 ? units[0] : `${units.length} units`;
const isSame = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function Policy() {
  const toast = useToast();
  const published = shieldStore.use((s) => s.categories);
  const version = shieldStore.use((s) => s.policyVersion);
  const publishedAt = shieldStore.use((s) => s.policyPublishedAt);
  const [draft, setDraft] = useState<ProtectionPolicy[]>(published);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  const changedIds = draft.filter((p) => !isSame(p, published.find((x) => x.id === p.id))).map((p) => p.id);
  const updateDraft = (id: string, changes: Partial<ProtectionPolicy>) =>
    setDraft((all) => all.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const publish = () => {
    const next = publishPolicy(draft);
    toast({
      variant: 'success',
      title: `Version ${next} published`,
      message: `${draft.length} policies watching ${keywordCount(draft)} keywords. Agents pick it up on their next check-in.`,
    });
  };
  const editing = draft.find((p) => p.id === editingId);

  return (
    <ShieldPage
      tab="policy"
      title="Protection policy"
      chip={<Chip tone="brand">Version {version}</Chip>}
      description={
        <>
          {published.length} policies watching {keywordCount(published)} keywords · published {ago(publishedAt)}. Change what gets flagged and what
          happens when it is, then publish the next version.
        </>
      }
    >
      <div className="stack">
        <section className="lf-card shield-legend" aria-label="How the policy reads">
          <div>
            <p className="shield-section">Risk level</p>
            <ul className="shield-legend__list">
              {RISKS.map((r) => <li key={r.id}><Chip tone={r.tone}>{r.label}</Chip><span>{r.hint}</span></li>)}
            </ul>
          </div>
          <div>
            <p className="shield-section">When it's found</p>
            <ul className="shield-legend__list">
              {ACTIONS.map((a) => <li key={a.id}><b>{a.label}</b><span>{a.hint}</span></li>)}
            </ul>
          </div>
        </section>

        <div className="shield-pol">
          {draft.map((p) => {
            const isExpanded = expanded.has(p.id);
            const changed = changedIds.includes(p.id);
            return (
              <section key={p.id} className={'lf-card shield-pol__card' + (changed ? ' is-changed' : '')} aria-label={p.title}>
                <div className="shield-pol__head">
                  <span className="shield-pol__ic"><Icon name={p.icon as IconName} size={18} /></span>
                  <div className="grow">
                    <h4>{p.title}</h4>
                    <p>{p.blurb}</p>
                  </div>
                </div>
                <div className="shield-pol__row">
                  <RiskChip risk={p.risk} />
                  <Chip tone="flat" icon="users">{unitsLabel(p.units)}</Chip>
                  {changed && <Chip tone="brand">Changed</Chip>}
                </div>
                <div className="shield-pol__kw">
                  {(isExpanded ? p.keywords : p.keywords.slice(0, KEYWORDS_SHOWN)).map((k) => <Chip key={k}>{k}</Chip>)}
                  {p.keywords.length > KEYWORDS_SHOWN && (
                    <button type="button" className="shield-pol__more" onClick={() => toggleExpanded(p.id)}>
                      {isExpanded ? 'Show fewer' : `+${p.keywords.length - KEYWORDS_SHOWN} more`}
                    </button>
                  )}
                </div>
                <div className="shield-pol__action">
                  <span id={`pol-act-${p.id}`}>When found</span>
                  <Dropdown
                    size="sm"
                    value={p.action}
                    ariaLabelledby={`pol-act-${p.id}`}
                    onChange={(v) => updateDraft(p.id, { action: v as PolicyAction })}
                    options={ACTIONS.map((a) => ({ value: a.id, label: a.label }))}
                  />
                </div>
                <div className="shield-pol__foot">
                  <span>{p.keywords.length} keywords</span>
                  <Button size="sm" icon="edit" onClick={() => setEditingId(p.id)}>Edit</Button>
                </div>
              </section>
            );
          })}
        </div>

        {changedIds.length > 0 && (
          <div className="shield-savebar" role="status">
            <Icon name="sparkles" size={16} />
            <div>
              <b>Version {version + 1} is ready to publish</b>
              <small>{changedIds.length} of {draft.length} policies changed · {keywordCount(draft)} keywords in total</small>
            </div>
            <span className="grow" />
            <Button onClick={() => setDraft(published)}>Discard</Button>
            <Button variant="primary" icon="check" onClick={publish}>Publish version {version + 1}</Button>
          </div>
        )}
      </div>

      {editing && (
        <PolicyEditor
          policy={editing}
          onClose={() => setEditingId(null)}
          onApply={(changes) => { updateDraft(editing.id, changes); setEditingId(null); }}
        />
      )}
    </ShieldPage>
  );
}

/** Drawer to edit one policy: risk, action, keywords (Enter or comma adds, Backspace on an empty box removes the last)
    and the units it applies to. "Apply to draft" hands the changes back to the page. */
function PolicyEditor({ policy, onClose, onApply }: {
  policy: ProtectionPolicy; onClose: () => void; onApply: (changes: Pick<ProtectionPolicy, 'risk' | 'action' | 'units' | 'keywords'>) => void;
}) {
  const [risk, setRisk] = useState<Risk>(policy.risk);
  const [action, setAction] = useState<PolicyAction>(policy.action);
  const [units, setUnits] = useState<Unit[]>(policy.units);
  const [keywords, setKeywords] = useState<string[]>(policy.keywords);
  const [typed, setTyped] = useState('');

  const addTyped = () => {
    const word = typed.trim();
    if (!word) return;
    if (!keywords.some((k) => k.toLowerCase() === word.toLowerCase())) setKeywords((all) => [...all, word]);
    setTyped('');
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={policy.title}
      subtitle={policy.blurb}
      width={560}
      footerNote={`${keywords.length} keywords · ${unitsLabel(units)}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => onApply({ risk, action, units, keywords })}>Apply to draft</Button></>}
    >
      <div className="page-form stack">
        <div className="fld">
          <span className="fld__lbl">Risk level</span>
          <RadioGroup value={risk} onChange={(v) => setRisk(v as Risk)} options={RISKS.map((r) => ({ value: r.id, label: `${r.label} · ${r.hint}` }))} />
        </div>
        <SelectField
          label="When it's found"
          value={action}
          onChange={(v) => setAction(v as PolicyAction)}
          help={actionOf(action).hint}
          options={ACTIONS.map((a) => ({ value: a.id, label: a.label }))}
        />
        <div className="fld">
          <span className="fld__lbl">Keywords</span>
          {/* Clicking anywhere in the box focuses the input. */}
          <div className="shield-kwedit" onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
            {keywords.map((k) => (
              <Chip key={k}>
                {k}
                <button type="button" aria-label={`Remove ${k}`} onClick={() => setKeywords((all) => all.filter((x) => x !== k))}>
                  <Icon name="x" size={11} />
                </button>
              </Chip>
            ))}
            <input
              value={typed}
              placeholder="Add a keyword and press Enter"
              aria-label="Add a keyword"
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTyped(); }
                if (e.key === 'Backspace' && !typed && keywords.length) setKeywords((all) => all.slice(0, -1));
              }}
              onBlur={addTyped}
            />
          </div>
          <small className="help">Matched case-insensitively in prompts, pasted text and the contents of uploads.</small>
        </div>
        <div className="fld">
          <span className="fld__lbl">Applies to</span>
          <div className="stack stack--sm">
            {UNITS.map((u) => (
              <Checkbox key={u} label={u} checked={units.includes(u)} onChange={(on) => setUnits((all) => (on ? [...all, u] : all.filter((x) => x !== u)))} />
            ))}
          </div>
          <small className="help">People outside these units are not watched for this category.</small>
        </div>
      </div>
    </Drawer>
  );
}
