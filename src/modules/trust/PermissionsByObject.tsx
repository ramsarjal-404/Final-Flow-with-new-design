import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Checkbox, Icon, IconButton, Menu, Modal, SearchField, Segmented, ToneTag } from '../../ui';
import { ReportPager, formatCell, useTableModel } from '../../reports';
import { FINANCE_PATH, RIGHTS, SEED, type AceEntry, type AclAccount, type EffectiveRow, type PobjObject } from './data';
import { DeepFrame, flagWanted, isYes, useDeepReport } from './frame';
import { DeepTable, PAGE_SIZES, useDeepModel, type DCol, type Status } from './DeepTable';
import { TreeNav, TreeSplit } from './TreePanel';
import { ObjectName, PermHead, PermTick, Principal, TickLegend, effectiveCols, flagCol } from './widgets';

/* SCR-TRU-05 · Permissions By Object (FLW-TRU-05 / 06) with DLG-TRU-04 (Effective Permission
   multi-select), DLG-TRU-05 (group access-control modal) and DLG-TRU-06 (group members modal).
   GAP intended fixes built here: GAP-TRU-02 (Directory narrows Objects by path, Stale Data by the
   not-accessed flag, Broken Inheritance applies on Apply and shows in the filter bar like any filter),
   GAP-TRU-03 (the members modal's close control / Escape close both modals), GAP-TRU-04 (ink selected
   pills, D-06), GAP-TRU-18 (accounts page like every other table). */

type Obj = PobjObject & { k: string };
type ByUser = EffectiveRow & { k: string };
const OBJECTS: Obj[] = SEED.POBJ_OBJECTS.map((r, i) => ({ ...r, k: String(i) }));
const BY_USER: ByUser[] = SEED.POBJ_BY_USER.map((r, i) => ({ ...r, k: String(i) }));
const ACCOUNTS = SEED.POBJ_ACCOUNTS;
const MODAL_TITLE = `Path: ${FINANCE_PATH}`;
const NO_ACCOUNTS = 'No accounts match the Effective Permission and Account filters.';

/** DLG-TRU-04 options in order. */
const EFFECTIVE_OPTIONS = ['All Permissions', 'Full Control', ...RIGHTS, 'None'];
type Highlight = '' | 'Inherited' | 'Direct' | 'Indirect';

const text = <T,>(key: keyof T & string, header: string, minWidth = 150): DCol<T> => ({
  key, header, sortable: true, filterable: true, minWidth, value: (r) => String(r[key] ?? ''),
});
const OBJ_COLS: DCol<Obj>[] = [
  { ...text<Obj>('name', 'Object Name', 220), render: (r) => <ObjectName name={r.name} kind={r.kind} /> },
  flagCol<Obj>('everyone'), flagCol<Obj>('broken'), flagCol<Obj>('notAccessed'),
  text<Obj>('type', 'Object Type', 130), text<Obj>('owner', 'Owner', 180), text<Obj>('contentType', 'Content Type', 220),
  text<Obj>('compliance', 'Compliance'), text<Obj>('monetary', 'Monetary Value'),
  { ...text<Obj>('risk', 'Risk Level', 130), render: (r) => formatCell('Risk Level', r.risk) },
  text<Obj>('lastScan', 'Last Scan', 180),
];
const BY_USER_COLS = effectiveCols<ByUser>();

/** Account matching (both tabs): Account Filter text, then any picked option other than "All Permissions". */
function matchesAccount(account: string, effective: string, query: string, picks: string[]) {
  const q = query.trim().toLowerCase();
  if (q && !account.toLowerCase().includes(q)) return false;
  const real = picks.filter((p) => p !== 'All Permissions');
  return !real.length || real.some((p) => effective.toLowerCase().includes(p.toLowerCase()));
}
const lit = (hl: Highlight, method: string) =>
  (hl === 'Inherited' && method === 'Inherited') || (hl === 'Direct' && method === 'Direct Applied') || (hl === 'Indirect' && method.startsWith('Indirect'));

export default function PermissionsByObject() {
  const rep = useDeepReport('permissions-by-object');
  const { status, gen, applied, filterRows } = rep;
  const [tab, setTab] = useState<'perm' | 'user'>('perm');
  const [picks, setPicks] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [hl, setHl] = useState<Highlight>('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<null | 'group' | 'members'>(null);

  // GAP-TRU-02 intended: Broken Inheritance applies on Apply (reduced tree while "yes" / "true").
  const broken = isYes(applied.find((f) => f.field === 'Broken Inheritance')?.value);
  const objects = useMemo(() => {
    const out = filterRows(OBJECTS, (r, f) => (f === 'File Mask' ? r.name : f === 'Directory' ? `${FINANCE_PATH}\\${r.name}`
      : f === 'Compliance' ? r.compliance : f === 'Monetary Value' ? r.monetary : undefined));
    const want = flagWanted(applied.find((f) => f.field === 'Stale Data'));
    return want === null ? out : out.filter((r) => r.notAccessed === want);
  }, [filterRows, applied]);
  const accounts = useMemo(() => ACCOUNTS.filter((a) => matchesAccount(a.account, a.effective, query, picks)), [query, picks]);
  const byUser = useMemo(() => BY_USER.filter((a) => matchesAccount(a.account, a.effective, query, picks)), [query, picks]);

  const om = useDeepModel(objects, OBJ_COLS, status, gen);
  const um = useDeepModel(byUser, BY_USER_COLS, status, gen);
  const am = useTableModel({ rows: status === 'ready' ? accounts : [], columns: [], pageSizes: PAGE_SIZES, defaultPageSize: 50, resetKey: `${gen}|${status}|${accounts.length}` });

  if (rep.entry.redirect || !rep.entry.row) return <Navigate to="/trust" replace />;
  const ready = status === 'ready';
  const exportTable = {
    columns: ['Object Name', 'Object Type', 'Owner', 'Content Type', 'Compliance', 'Monetary Value', 'Risk Level', 'Last Scan'],
    rows: objects.map((r) => [r.name, r.type, r.owner, r.contentType, r.compliance, r.monetary, r.risk, r.lastScan]),
  };
  const toggleAccount = (a: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(a)) n.delete(a); else n.add(a); return n; });

  return (
    <DeepFrame rep={rep} exportTable={exportTable}>
      <TreeSplit title="File Server" show={ready}
        tree={<TreeNav key={broken ? 'broken' : 'full'} root={broken ? SEED.OBJECT_TREE_BROKEN : SEED.OBJECT_TREE} label="File Server" />}>
        <DeepTable model={om} columns={OBJ_COLS} rowKey={(r) => r.k} title="Objects" titleId="tru-pobj-objects" status={status} primary onGenerate={rep.generate} />

        <section className="lf-card tablecard tru-acl" aria-labelledby="tru-pobj-path">
          <div className="toolbar">
            <h3 className="lf-card__title" id="tru-pobj-path" style={{ margin: 0 }}><span className="tru-title tru-title--path">Path : {FINANCE_PATH}</span></h3>
            <TickLegend denied />
          </div>
          <div className="tru-aclbar">
            <Segmented ariaLabel="Access control view" value={tab} onChange={(v) => setTab(v as 'perm' | 'user')}
              items={[{ value: 'perm', label: 'Permissions' }, { value: 'user', label: 'Permissions by user' }]} hug />
            <div className="tru-aclbar__field">
              <span className="tru-aclbar__lbl" id="tru-eff-lbl">Effective Permission :</span>
              <EffectivePicker value={picks} onApply={setPicks} />
            </div>
            <div className="tru-aclbar__field">
              <span className="tru-aclbar__lbl" aria-hidden="true">Account Filter :</span>
              <SearchField value={query} onChange={setQuery} placeholder="Search" ariaLabel="Account filter" className="tru-aclbar__search" />
            </div>
            <div className="tru-aclbar__field">
              <span className="tru-aclbar__lbl" aria-hidden="true">Highlight permissions</span>
              <Segmented mode="pressed" hug ariaLabel="Highlight permissions" value={hl} onChange={(v) => setHl(hl === v ? '' : (v as Highlight))}
                items={[{ value: 'Inherited', label: 'Inherited' }, { value: 'Direct', label: 'Direct' }, { value: 'Indirect', label: 'Indirect' }]} />
            </div>
          </div>
          {!ready || tab === 'user' ? (
            <DeepTable model={um} columns={BY_USER_COLS} rowKey={(r) => r.k} status={status} emptyText={NO_ACCOUNTS} className="tru-table--bare" />
          ) : (
            <AclTable accounts={am.slice} total={accounts.length} hl={hl} collapsed={collapsed} onToggle={toggleAccount}
              onExplore={() => setModal('group')}
              pager={<ReportPager total={accounts.length} label={(n) => `Total Records - ${n}`} page={am.page} pages={am.pages} size={am.size}
                sizes={am.pageSizes} onPage={am.setPage} onSize={am.setSize} />} />
          )}
        </section>
      </TreeSplit>

      {modal && <GroupModal onClose={() => setModal(null)} onMembers={() => setModal('members')} />}
      {modal === 'members' && <MembersModal onBack={() => setModal('group')} onClose={() => setModal(null)} />}
    </DeepFrame>
  );
}

/* ---------------- access-control tree table (03 § 9.5) ---------------- */
const ACE_HEAD = ['Access Type', 'Permission', 'Permission Method', 'Inherited From', 'Applies To'];

function AceRow({ e, hl, onExplore }: { e: AceEntry; hl: Highlight; onExplore?: () => void }) {
  const on = !!hl && lit(hl, e.method);
  return (
    <tr className={'tru-ace' + (on ? ' is-hl' : '')}>
      <td className="tru-ace__first"><span className="tree-spacer" aria-hidden="true" /><ToneTag tone={e.access === 'Allowed' ? 'good' : 'bad'}>{e.access}</ToneTag>
        {on && <span className="sr-only">(highlighted)</span>}</td>
      <td title={e.permission}>{e.permission}</td>
      <td title={e.method}>
        <span className="tru-method">
          <span className="tru-method__t">{e.method}</span>
          {e.drill && onExplore && <IconButton icon="users" label="Show the group behind this permission" onClick={onExplore} className="tru-explore" />}
        </span>
      </td>
      <td title={e.inheritedFrom}>{e.inheritedFrom}</td>
      <td title={e.appliesTo}>{e.appliesTo}</td>
      {RIGHTS.map((_, i) => <td key={i} className="tru-td-perm"><PermTick code={e.perms[i] ?? '-'} i={i} /></td>)}
    </tr>
  );
}

function AceHead() {
  return (
    <thead>
      <tr>
        {ACE_HEAD.map((h, i) => <th key={h} style={{ minWidth: i === 1 ? 260 : i === 2 ? 230 : 170 }}>{h}</th>)}
        {RIGHTS.map((_, i) => <th key={i} className="tru-th-narrow" style={{ width: 78, minWidth: 78 }}><PermHead i={i} /></th>)}
      </tr>
    </thead>
  );
}

function usePin() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState<number | undefined>();
  useEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); return () => ro.disconnect(); }, []);
  return { ref, pin: { position: 'sticky', left: 0, width: w } as React.CSSProperties };
}

function AclTable({ accounts, total, hl, collapsed, onToggle, onExplore, pager }: {
  accounts: AclAccount[]; total: number; hl: Highlight; collapsed: Set<string>; onToggle: (a: string) => void; onExplore: () => void; pager: React.ReactNode;
}) {
  const { ref, pin } = usePin();
  const span = ACE_HEAD.length + RIGHTS.length;
  return (
    <>
      <div ref={ref} className="tbl-wrap tru-acl__wrap">
        <table className="lf-table tru-acl__table" aria-label="Access control list">
          <AceHead />
          <tbody className="rows-in">
            {total === 0 ? (
              <tr><td colSpan={span} className="empty-cell" style={{ maxWidth: 'none', position: 'static', padding: 0 }}>
                <div style={{ ...pin, minHeight: 120, display: 'grid', placeItems: 'center', padding: '0 16px' }}>{NO_ACCOUNTS}</div></td></tr>
            ) : accounts.map((a) => {
              const open = !collapsed.has(a.account);
              return [
                <tr key={a.account} className="tru-acct" aria-level={1} aria-expanded={open}>
                  <td colSpan={span} style={{ maxWidth: 'none', position: 'static', padding: 0 }}>
                    <div className="tru-acct__in" style={pin}>
                      <button type="button" className="tree-toggle" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${a.account}`} onClick={() => onToggle(a.account)}>
                        <Icon name="chevron-right" size={14} />
                      </button>
                      <Principal name={a.account} group={a.group} />
                      <span className="tru-acct__eff" title={a.effective}>Effective Permissions : ( {a.effective} )</span>
                    </div>
                  </td>
                </tr>,
                ...(open ? a.entries.map((e, i) => <AceRow key={a.account + i} e={e} hl={hl} onExplore={onExplore} />) : []),
              ];
            })}
          </tbody>
        </table>
      </div>
      {pager}
    </>
  );
}

/* ---------------- DLG-TRU-04 · Effective Permission multi-select ---------------- */
function EffectivePicker({ value, onApply }: { value: string[]; onApply: (v: string[]) => void }) {
  const [draft, setDraft] = useState<string[]>(value);
  const shown = value.length === 0 ? 'All Permissions' : value.length <= 2 ? value.join(', ') : `${value.length} selected`;
  return (
    <Menu label="Effective Permission" width={300} align="left"
      trigger={(p) => (
        <button type="button" className="tru-picker" aria-labelledby="tru-eff-lbl tru-eff-val" {...p}
          onClick={() => { setDraft(value); p.onClick(); }}>
          <span id="tru-eff-val" className={value.length ? '' : 'is-ph'}>{shown}</span><Icon name="chevron" size={14} />
        </button>
      )}>
      {(close) => (
        <div className="tru-pick" role="dialog" aria-label="Effective Permission">
          <div className="tru-pick__list" role="group" aria-label="Effective Permission options">
            {EFFECTIVE_OPTIONS.map((o) => (
              <Checkbox key={o} label={o} checked={draft.includes(o)}
                onChange={(on) => setDraft((d) => (on ? [...d, o] : d.filter((x) => x !== o)))} />
            ))}
          </div>
          <div className="dp__foot">
            <Button size="sm" onClick={close}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={() => { onApply(EFFECTIVE_OPTIONS.filter((o) => draft.includes(o))); close(); }}>Apply</Button>
          </div>
        </div>
      )}
    </Menu>
  );
}

/* ---------------- DLG-TRU-05 · Group access-control modal ---------------- */
function GroupModal({ onClose, onMembers }: { onClose: () => void; onMembers: () => void }) {
  const g = SEED.POBJ_GROUP_MODAL;
  return (
    <Modal open onClose={onClose} title={MODAL_TITLE} icon="users" size="lg" bodyClassName="tru-modal"
      footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      <div className="tru-acct tru-acct--bar">
        <div className="tru-acct__in">
          <Principal name={g.account} group />
          <IconButton icon="users" label="Show the group's members" bordered onClick={onMembers} />
          <span className="tru-acct__eff" title={g.effective}>Effective Permissions : ( {g.effective} )</span>
        </div>
      </div>
      <div className="lf-card tablecard tablecard--flat tru-modal__table">
        <div className="tbl-wrap">
          <table className="lf-table tru-acl__table" aria-label={`Access control entries of ${g.account}`}>
            <AceHead />
            <tbody>{g.entries.map((e, i) => <AceRow key={i} e={e} hl="" />)}</tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- DLG-TRU-06 · Group members modal ---------------- */
type Member = EffectiveRow & { k: string };
const MEMBERS: Member[] = SEED.POBJ_MEMBERS.map((r, i) => ({ ...r, k: String(i) }));
const MEMBER_COLS = effectiveCols<Member>(false);

function MembersModal({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const model = useDeepModel(MEMBERS, MEMBER_COLS, 'ready' as Status, 0);
  const g = SEED.POBJ_GROUP_MODAL;
  return (
    <Modal open onClose={onClose} title={MODAL_TITLE} icon="users" size="lg" bodyClassName="tru-modal"
      footer={<><Button onClick={onBack}>Back</Button><Button variant="primary" onClick={onClose}>Close</Button></>}>
      <p className="tru-lead">Members of <b>{g.account}</b> and their effective permissions</p>
      <DeepTable model={model} columns={MEMBER_COLS} rowKey={(r) => r.k} status="ready" noFilterRow flat className="tru-modal__table" />
    </Modal>
  );
}

