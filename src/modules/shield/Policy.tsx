// @ts-nocheck — ported from the live prototype (https://lepide-new-ui.vercel.app/shield); shapes are in ./types.ts.
/* AI Shield › Protection policy (/shield/policy): risk and action legend, one card per policy, the policy editor drawer and the "Publish version" bar. */
import * as React from 'react';
import { Chip, Icon, Button, useToast, Drawer, SelectField, RadioGroup, Dropdown, Checkbox } from '../../ui';
import { RISKS, ACTIONS, actionOf, UNITS } from './data';
import { shieldStore, keywordCount, publishPolicy } from './store';
import { ShieldPage, RiskChip, ago } from './parts';

export const unitsLabel = (t) =>
  t.length === 0 ? 'No units' : t.length === UNITS.length ? 'All units' : t.length === 1 ? t[0] : `${t.length} units`;
export const sameJson = (t, n) => JSON.stringify(t) === JSON.stringify(n);
export function Policy() {
  const t = useToast(),
    n = shieldStore.use((s) => s.categories),
    o = shieldStore.use((s) => s.policyVersion),
    c = shieldStore.use((s) => s.policyPublishedAt),
    [d, u] = React.useState(n),
    [f, x] = React.useState(new Set()),
    [j, r] = React.useState(null),
    v = React.useMemo(
      () =>
        d
          .filter(
            (s) =>
              !sameJson(
                s,
                n.find((i) => i.id === s.id),
              ),
          )
          .map((s) => s.id),
      [d, n],
    ),
    m = (s, i) =>
      u((l) =>
        l.map((a) =>
          a.id === s
            ? {
                ...a,
                ...i,
              }
            : a,
        ),
      ),
    p = () => {
      const s = publishPolicy(d);
      t({
        variant: 'success',
        title: `Version ${s} published`,
        message: `${d.length} policies watching ${keywordCount(d)} keywords. Agents pick it up on their next check-in.`,
      });
    };
  return (
    <ShieldPage
      tab="policy"
      title="Protection policy"
      chip={
        <Chip tone="brand">
          {'Version '}
          {o}
        </Chip>
      }
      description={
        <>
          {n.length}
          {' policies watching '}
          {keywordCount(n)}
          {' keywords · published '}
          {ago(c)}. Change what gets flagged and what happens when it is, then publish the next version.
        </>
      }
    >
      <div className="stack">
        <section className="lf-card shield-legend" aria-label="How the policy reads">
          <div>
            <p className="shield-section">Risk level</p>
            <ul className="shield-legend__list">
              {RISKS.map((s) => (
                <li key={s.id}>
                  <Chip tone={s.tone}>{s.label}</Chip>
                  <span>{s.hint}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="shield-section">When it's found</p>
            <ul className="shield-legend__list">
              {ACTIONS.map((s) => (
                <li key={s.id}>
                  <b>{s.label}</b>
                  <span>{s.hint}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <div className="shield-pol">
          {d.map((s) => {
            const i = f.has(s.id),
              l = i ? s.keywords : s.keywords.slice(0, 5);
            return (
              <section
                className={'lf-card shield-pol__card' + (v.includes(s.id) ? ' is-changed' : '')}
                aria-label={s.title}
                key={s.id}
              >
                <div className="shield-pol__head">
                  <span className="shield-pol__ic">
                    <Icon name={s.icon} size={18} />
                  </span>
                  <div className="grow">
                    <h4>{s.title}</h4>
                    <p>{s.blurb}</p>
                  </div>
                </div>
                <div className="shield-pol__row">
                  <RiskChip risk={s.risk} />
                  <Chip tone="flat" icon="users">
                    {unitsLabel(s.units)}
                  </Chip>
                  {v.includes(s.id) && <Chip tone="brand">Changed</Chip>}
                </div>
                <div className="shield-pol__kw">
                  {l.map((a) => (
                    <Chip key={a}>{a}</Chip>
                  ))}
                  {s.keywords.length > 5 && (
                    <button
                      type="button"
                      className="shield-pol__more"
                      onClick={() =>
                        x((a) => {
                          const h = new Set(a);
                          return h.has(s.id) ? h.delete(s.id) : h.add(s.id), h;
                        })
                      }
                    >
                      {i ? 'Show fewer' : `+${s.keywords.length - 5} more`}
                    </button>
                  )}
                </div>
                <div className="shield-pol__action">
                  <span id={`pol-act-${s.id}`}>When found</span>
                  <Dropdown
                    size="sm"
                    value={s.action}
                    ariaLabelledby={`pol-act-${s.id}`}
                    onChange={(a) =>
                      m(s.id, {
                        action: a,
                      })
                    }
                    options={ACTIONS.map((a) => ({
                      value: a.id,
                      label: a.label,
                    }))}
                  />
                </div>
                <div className="shield-pol__foot">
                  <span>
                    {s.keywords.length}
                    {' keywords'}
                  </span>
                  <Button size="sm" icon="edit" onClick={() => r(s)}>
                    Edit
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
        {v.length > 0 && (
          <div className="shield-savebar" role="status">
            <Icon name="sparkles" size={16} />
            <div>
              <b>
                {'Version '}
                {o + 1}
                {' is ready to publish'}
              </b>
              <small>
                {v.length}
                {' of '}
                {d.length}
                {' policies changed · '}
                {keywordCount(d)}
                {' keywords in total'}
              </small>
            </div>
            <span className="grow" />
            <Button onClick={() => u(n)}>Discard</Button>
            <Button variant="primary" icon="check" onClick={p}>
              {'Publish version '}
              {o + 1}
            </Button>
          </div>
        )}
      </div>
      {j && (
        <PolicyEditor
          category={d.find((s) => s.id === j.id)}
          onClose={() => r(null)}
          onApply={(s) => {
            m(j.id, s), r(null);
          }}
        />
      )}
    </ShieldPage>
  );
}
export function PolicyEditor({ category: t, onClose: n, onApply: o }) {
  const [c, d] = React.useState(t.risk),
    [u, f] = React.useState(t.action),
    [x, j] = React.useState(t.units),
    [r, v] = React.useState(t.keywords),
    [m, p] = React.useState(''),
    s = () => {
      const i = m.trim();
      i && (r.some((l) => l.toLowerCase() === i.toLowerCase()) || v((l) => [...l, i]), p(''));
    };
  return (
    <Drawer
      open={!0}
      onClose={n}
      title={t.title}
      subtitle={t.blurb}
      width={560}
      footerNote={`${r.length} keywords · ${unitsLabel(x)}`}
      footer={
        <>
          <Button onClick={n}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() =>
              o({
                risk: c,
                action: u,
                units: x,
                keywords: r,
              })
            }
          >
            Apply to draft
          </Button>
        </>
      }
    >
      <div className="page-form stack">
        <div className="fld">
          <span className="fld__lbl">Risk level</span>
          <RadioGroup
            value={c}
            onChange={(i) => d(i)}
            options={RISKS.map((i) => ({
              value: i.id,
              label: `${i.label} · ${i.hint}`,
            }))}
          />
        </div>
        <SelectField
          label="When it's found"
          value={u}
          onChange={(i) => f(i)}
          help={actionOf(u).hint}
          options={ACTIONS.map((i) => ({
            value: i.id,
            label: i.label,
          }))}
        />
        <div className="fld">
          <span className="fld__lbl">Keywords</span>
          <div
            className="shield-kwedit"
            onClick={(i) => {
              var l;
              return (l = i.currentTarget.querySelector('input')) == null ? void 0 : l.focus();
            }}
          >
            {r.map((i) => (
              <Chip key={i}>
                {i}
                <button type="button" aria-label={`Remove ${i}`} onClick={() => v((l) => l.filter((a) => a !== i))}>
                  <Icon name="x" size={11} />
                </button>
              </Chip>
            ))}
            <input
              value={m}
              placeholder="Add a keyword and press Enter"
              aria-label="Add a keyword"
              onChange={(i) => p(i.target.value)}
              onKeyDown={(i) => {
                (i.key === 'Enter' || i.key === ',') && (i.preventDefault(), s()),
                  i.key === 'Backspace' && !m && r.length && v((l) => l.slice(0, -1));
              }}
              onBlur={s}
            />
          </div>
          <small className="help">
            Matched case-insensitively in prompts, pasted text and the contents of uploads.
          </small>
        </div>
        <div className="fld">
          <span className="fld__lbl">Applies to</span>
          <div className="stack stack--sm">
            {UNITS.map((i) => (
              <Checkbox
                label={i}
                checked={x.includes(i)}
                onChange={(l) => j((a) => (l ? [...a, i] : a.filter((h) => h !== i)))}
                key={i}
              />
            ))}
          </div>
          <small className="help">People outside these units are not watched for this category.</small>
        </div>
      </div>
    </Drawer>
  );
}
