import { Suspense, createContext, useContext, useEffect, useState } from 'react';
import { useActiveExportCount } from '../stores/exports';
import { SUB, subStore } from '../stores/subscription';

/** Exports still in progress: session jobs (export store) + seeded jobs that haven't reached 100 %
    (same clock rule as the Exported Files page). Ticks once a second only while seeds are running. */
function useInProgressExports() {
  const fromStore = useActiveExportCount();
  const clock = subStore.use((s) => s.seedClockStart);
  const deleted = subStore.use((s) => s.deletedSeeds);
  const [now, setNow] = useState(() => Date.now());
  const seeds = SUB.SEED_EXPORTED_FILES.filter((s) => !deleted.includes(s.id)).filter((s) => {
    const elapsed = clock === null ? 0 : Math.max(0, Math.floor((now - clock) / 1000));
    return Math.min(100, s.start + elapsed * s.rate) < 100;
  }).length;
  useEffect(() => {
    if (clock === null || seeds === 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [clock, seeds]);
  return fromStore + seeds;
}
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Dropdown, EmptyState, Icon, PageHeader, PageLoader } from '../ui';
import { CATEGORIES, categoryById } from './categories';

/* SCR-SET-01 Settings frame, drawn as ui-design-system/04 § 11:
   breadcrumbs + title row (category label + the page's actions) · Categories navigation · content. */

type Slots = { actions: HTMLElement | null; description: HTMLElement | null; setTitle: (t: string | undefined) => void };
const SlotCtx = createContext<Slots>({ actions: null, description: null, setTitle: () => {} });

/** Override the page title while mounted (e.g. SQL Authentication shows the current tab's label). */
export function useSettingsTitle(title: string | undefined) {
  const { setTitle } = useContext(SlotCtx);
  useEffect(() => { setTitle(title); return () => setTitle(undefined); }, [title, setTitle]);
}

/** Put page-level actions (PrimaryAction / SecondaryAction / SearchField) into the title row. */
export function HeaderActions({ children }: { children: ReactNode }) {
  const el = useContext(SlotCtx).actions;
  return el ? createPortal(children, el) : null;
}
/** Optional one-line description under the category title. */
export function HeaderDescription({ children }: { children: ReactNode }) {
  const el = useContext(SlotCtx).description;
  return el ? createPortal(children, el) : null;
}

export default function SettingsFrame() {
  const { category } = useParams();
  const nav = useNavigate();
  const cat = categoryById(category);
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [description, setDescription] = useState<HTMLElement | null>(null);
  const [override, setOverride] = useState<string | undefined>(undefined);
  const activeExports = useInProgressExports();
  const current = cat?.listed ? cat.id : cat?.id === 'manage-component' ? 'add-data-source' : undefined;
  const title = override ?? (cat ? cat.title ?? cat.label : 'Settings');
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Settings', to: '/settings' },
    ...(cat?.id === 'manage-component' ? [{ label: 'Add Data Source', to: '/settings/add-data-source' }] : []), { label: title }];

  return (
    <div className="sub">
      <PageHeader crumbs={crumbs} title={title}
        actions={<div className="actions" ref={setActions} style={{ display: 'contents' }} />}>
        <div ref={setDescription} className="settings__desc" />
      </PageHeader>
      <div className="settings">
        <nav className="lf-card snav" aria-label="Categories">
          <p className="snav__title">Categories</p>
          {CATEGORIES.filter((x) => x.listed).map((x) => (
            <button key={x.id} type="button" className="snav__item" aria-current={x.id === current ? 'page' : undefined}
              onClick={() => nav('/settings/' + x.id)}>
              <Icon name={x.icon} /><span>{x.label}</span>
              {/* GAP-SAD-16 intended: a count of exports still in progress. */}
              {x.id === 'exported-files' && activeExports > 0 && (
                <span className="n snav__badge" aria-label={`${activeExports} export${activeExports === 1 ? '' : 's'} in progress`}>{activeExports}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="lf-field snav-select">
          <span className="lf-field__label" id="snav-select-lbl">Category</span>
          <Dropdown pill value={current ?? ''} ariaLabelledby="snav-select-lbl" onChange={(v) => nav('/settings/' + v)}
            options={CATEGORIES.filter((x) => x.listed).map((x) => ({ value: x.id, label: x.label }))} />
        </div>
        <section className="settings__body" aria-label={title}>
          <SlotCtx.Provider value={{ actions, description, setTitle: setOverride }}>
            {cat ? (
              <Suspense fallback={<section className="lf-card" style={{ minHeight: 360 }}><PageLoader /></section>}>
                <cat.Page key={cat.id} />
              </Suspense>
            ) : (
              <section className="lf-card tablecard" style={{ minHeight: 420 }}>
                {/* GAP-SET-02 intended: not-found state with a link back to Role Management. */}
                <EmptyState icon="search" title="This settings page doesn't exist."
                  action={<Button variant="primary" onClick={() => nav('/settings/role-management')}>Go to role management</Button>} />
              </section>
            )}
          </SlotCtx.Provider>
        </section>
      </div>
    </div>
  );
}
