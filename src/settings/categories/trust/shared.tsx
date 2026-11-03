import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Checkbox, Dropdown, Field, Icon, PasswordField, RadioGroup, SelectField, TextField } from '../../../ui';
import type { IconName } from '../../../ui';
import { DATABASES, DOMAINS } from './store';
import type { SqlValue } from './store';

/* ---------- local header of a Trust sub-page (crumbs, logo, title, actions) ---------- */
export type Crumb = { label: string; to?: string; onClick?: () => void };
export function SubHeader({ crumbs, logo, title, subtitle, actions, back }: {
  crumbs: Crumb[]; logo?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: { label: string; onClick: () => void };
}) {
  return (
    <section className="lf-card trust-sub">
      <div className="row">
        {back && (
          <button type="button" className="lf-btn lf-btn--icon trust-back" aria-label={back.label} onClick={back.onClick}>
            <Icon name="chevron-left" />
          </button>
        )}
        <nav className="crumbs trust-crumbs" aria-label="Breadcrumb">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={i} style={{ display: 'contents' }}>
                {i > 0 && <span aria-hidden="true">/</span>}
                {last ? <b aria-current="page">{c.label}</b>
                  : c.to ? <Link to={c.to}>{c.label}</Link>
                  : <button type="button" className="trust-crumb-btn" onClick={c.onClick}>{c.label}</button>}
              </span>
            );
          })}
        </nav>
      </div>
      <div className="trust-head">
        {logo && <span className="trust-logo"><img src={logo} alt="" /></span>}
        <div className="trust-head__text"><h3>{title}</h3>{subtitle && <small>{subtitle}</small>}</div>
        {actions && <div className="row row--wrap">{actions}</div>}
      </div>
    </section>
  );
}

/** Pill search with an explicit "Clear search" action. */
export function SearchBox({ value, onChange, ariaLabel, maxLength = 100, placeholder = 'Search' }: {
  value: string; onChange: (v: string) => void; ariaLabel: string; maxLength?: number; placeholder?: string;
}) {
  return (
    <label className="lf-field trust-search">
      <span className="lf-input lf-input--pill">
        <Icon name="search" />
        <input value={value} placeholder={placeholder} aria-label={ariaLabel} maxLength={maxLength} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.stopPropagation(); onChange(''); } }} />
        {value && <button type="button" className="trust-clear" aria-label="Clear search" onClick={() => onChange('')}><Icon name="x" size={14} /></button>}
      </span>
    </label>
  );
}

/** Keeps a tooltip on a control that may be disabled. */
export function Tip({ tip, children }: { tip?: string; children: ReactNode }) {
  if (!tip) return <>{children}</>;
  return <span className="trust-tipwrap" data-tip={tip}>{children}</span>;
}

/* ---------- tree navigator pieces (Lepide Design System .tree) ---------- */
export function TreeGroup({ label, open, onToggle, children, icon = 'server', selected, onSelect }: {
  label: string; open: boolean; onToggle: () => void; children?: ReactNode; icon?: IconName; selected?: boolean; onSelect?: () => void;
}) {
  return (
    <li className="grp">
      <span className="trust-tree-row">
        <button type="button" className="tree-toggle" aria-label={open ? `Collapse ${label}` : `Expand ${label}`} aria-expanded={open} onClick={onToggle}>
          <Icon name="chevron-right" />
        </button>
        <button type="button" className="trust-tree-node" aria-selected={selected || undefined} onClick={onSelect ?? onToggle}>
          <Icon name={icon} size={15} /><span>{label}</span>
        </button>
      </span>
      {open && <ul role="group">{children}</ul>}
    </li>
  );
}
export function TreeLeaf({ label, selected, onSelect, onDouble, icon = 'folder', check }: {
  label: string; selected?: boolean; onSelect?: () => void; onDouble?: () => void; icon?: IconName; check?: { checked: boolean; onChange: (v: boolean) => void };
}) {
  return (
    <li>
      {check ? (
        <span className="trust-tree-check"><Checkbox checked={check.checked} onChange={check.onChange} label={<><Icon name={icon} size={14} /> {label}</>} /></span>
      ) : (
        <button type="button" role="treeitem" aria-selected={!!selected} onClick={onSelect} onDoubleClick={onDouble}>
          <Icon name={icon} /><span>{label}</span>
        </button>
      )}
    </li>
  );
}

/* ---------- small checkable table used in dialogs and wizard steps ---------- */
export type MiniCol<T> = { key: string; header: string; cell: (r: T) => ReactNode; text?: (r: T) => string };
export function CheckTable<T>({ rows, cols, rowKey, checked, onChecked, empty, maxHeight = 280, label, radio, filter, onFilter }: {
  rows: T[]; cols: MiniCol<T>[]; rowKey: (r: T) => string; checked?: string[]; onChecked?: (k: string[]) => void;
  empty: ReactNode; maxHeight?: number; label?: string; radio?: boolean;
  filter?: Record<string, string>; onFilter?: (f: Record<string, string>) => void;
}) {
  const sel = checked ?? [];
  const shown = filter ? rows.filter((r) => cols.every((c) => { const f = (filter[c.key] ?? '').trim().toLowerCase(); return !f || (c.text ? c.text(r) : '').toLowerCase().includes(f); })) : rows;
  const keys = shown.map(rowKey);
  const all = keys.length > 0 && keys.every((k) => sel.includes(k));
  const some = keys.some((k) => sel.includes(k));
  const toggle = (k: string) => onChecked?.(radio ? [k] : sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]);
  const span = cols.length + (onChecked ? 1 : 0);
  return (
    <div className="tbl-wrap trust-mini" style={{ maxHeight }}>
      <table className="lf-table" aria-label={label}>
        <thead>
          <tr>
            {onChecked && <th className="th-check">{!radio && <Checkbox checked={all} indeterminate={some && !all} ariaLabel="Select all rows"
              onChange={() => onChecked(all ? sel.filter((k) => !keys.includes(k)) : Array.from(new Set([...sel, ...keys])))} />}</th>}
            {cols.map((c) => <th key={c.key}>{c.header}</th>)}
          </tr>
          {filter && onFilter && (
            <tr className="filter-row">
              {onChecked && <th />}
              {cols.map((c) => (
                <th key={c.key}>{c.text && (
                  <span className={'filter-input' + (filter[c.key] ? ' has-value' : '')}>
                    <Icon name="search" size={12} />
                    <input value={filter[c.key] ?? ''} placeholder="Filter" aria-label={`Filter ${c.header}`} maxLength={100}
                      onChange={(e) => onFilter({ ...filter, [c.key]: e.target.value })} />
                  </span>
                )}</th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={span} className="tbl-empty" style={{ position: 'static' }}>{empty}</td></tr>
          ) : shown.length === 0 ? (
            <tr><td colSpan={span} className="tbl-empty" style={{ position: 'static' }}>No results match your search or filters.</td></tr>
          ) : shown.map((r) => {
            const k = rowKey(r); const on = sel.includes(k);
            return (
              <tr key={k} className={'lf-row' + (on ? ' is-sel' : '')} style={onChecked ? undefined : { cursor: 'default' }}
                onClick={(e) => { if (!onChecked || (e.target as Element).closest('label,button,input,select')) return; toggle(k); }}>
                {onChecked && <td className="td-check">
                  {radio ? (
                    <label className="trust-radio"><input type="radio" name={label} checked={on} aria-label={`Select ${k}`} onChange={() => toggle(k)} /></label>
                  ) : <Checkbox checked={on} ariaLabel={`Select ${k}`} onChange={() => toggle(k)} />}
                </td>}
                {cols.map((c) => <td key={c.key} className="td-wrap">{c.cell(r)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- digits-only field with a unit ---------- */
export function DigitsField({ label, value, onChange, max = 4, unit, error, disabled }: {
  label: string; value: string; onChange: (v: string) => void; max?: number; unit?: string; error?: string | null; disabled?: boolean;
}) {
  return (
    <Field label={label} error={error}>
      <div className="trust-unit">
        <input inputMode="numeric" value={value} maxLength={max} disabled={disabled} aria-label={label} aria-invalid={!!error || undefined}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, max))} />
        {unit && <span className="muted text-sm">{unit}</span>}
      </div>
    </Field>
  );
}

/* ---------- SQL block (DLG-SDS-43 fields; also the Primary Database tab) ---------- */
export type SqlErrors = Partial<Record<'server' | 'user' | 'password' | 'database', boolean>>;
export function sqlErrors(v: SqlValue): SqlErrors {
  const e: SqlErrors = {};
  if (!v.server.trim()) e.server = true;
  if (v.auth === 'sql' && !v.user.trim()) e.user = true;
  if (v.auth === 'sql' && !v.password) e.password = true;
  if (!v.database.trim()) e.database = true;
  return e;
}

export function SqlBlock({ value, onChange, errors = {}, onBrowse, onTest }: {
  value: SqlValue; onChange: (v: SqlValue) => void; errors?: SqlErrors; onBrowse: () => void; onTest: () => void;
}) {
  const set = (p: Partial<SqlValue>) => onChange({ ...value, ...p });
  const sql = value.auth === 'sql';
  return (
    <div className="stack">
      <div className="trust-inline">
        <TextField className="grow" label="SQL Server" value={value.server} error={errors.server ? ' ' : null} placeholder="Enter or browse a SQL Server"
          onChange={(v) => set({ server: v })} />
        <Button icon="search" onClick={onBrowse}>Browse</Button>
      </div>
      <Field label="Authentication Type">
        <RadioGroup row ariaLabel="Authentication Type" value={value.auth} onChange={(v) => set({ auth: v as SqlValue['auth'] })}
          options={[{ value: 'windows', label: 'Windows Authentication' }, { value: 'sql', label: 'SQL Authentication (Recommended)' }]} />
      </Field>
      <div className="fld-row">
        <TextField label="User Name" value={value.user} disabled={!sql} error={errors.user ? ' ' : null} onChange={(v) => set({ user: v })} />
        <PasswordField label="Password" value={value.password} disabled={!sql} error={errors.password ? ' ' : null} onChange={(v) => set({ password: v })} />
      </div>
      <div><Button icon="plug" onClick={onTest}>Test connection</Button></div>
      <Field label="Database" error={errors.database ? ' ' : null}>
        <div className="trust-db">
          <RadioGroup row ariaLabel="Database" value={value.mode} onChange={(v) => set({ mode: v as SqlValue['mode'], database: '' })}
            options={[{ value: 'create', label: 'Create Database' }, { value: 'select', label: 'Select Database' }]} />
          {value.mode === 'create' ? (
            <input aria-label="Create Database" placeholder="Enter database name" value={value.database} aria-invalid={errors.database || undefined}
              onChange={(e) => set({ database: e.target.value })} />
          ) : (
            <Dropdown ariaLabel="Select Database" value={value.database} invalid={!!errors.database} placeholder="Select" clearable
              onChange={(v) => set({ database: v })} options={DATABASES} />
          )}
        </div>
      </Field>
      <p className="section-label">Time Out Settings</p>
      <div className="fld-row">
        <DigitsField label="Connection Time Out" unit="Seconds" value={value.connTimeout} onChange={(v) => set({ connTimeout: v })} />
        <DigitsField label="Query Time Out" unit="Seconds" value={value.queryTimeout} onChange={(v) => set({ queryTimeout: v })} />
      </div>
    </div>
  );
}

/** Test Connection rule shared by the SQL block users. Returns the toast to show. */
export function testConnection(v: SqlValue) {
  if (!v.server.trim()) return { variant: 'error' as const, title: 'Test connection', message: 'Please enter or browse a SQL Server first.' };
  if (v.auth === 'sql' && (!v.user.trim() || !v.password)) return { variant: 'error' as const, title: 'Test connection', message: 'Please enter the SQL user name and password.' };
  return { variant: 'success' as const, title: 'Connection successful', message: `Connected to ${v.server.trim()}.` };
}

/* ---------- domain credentials block (DLG-SDS-45/46/47) ---------- */
export type Creds = { user: string; password: string; mode: 'select' | 'type'; domain: string; typed: string };
export const emptyCreds = (): Creds => ({ user: '', password: '', mode: 'select', domain: '', typed: '' });
export type CredErrors = Partial<Record<'user' | 'password' | 'domain', boolean>>;
export function credErrors(c: Creds): CredErrors {
  const e: CredErrors = {};
  if (!c.user.trim()) e.user = true;
  if (!c.password) e.password = true;
  if (c.mode === 'select' ? !c.domain : !c.typed.trim()) e.domain = true;
  return e;
}
export function CredBlock({ value, onChange, errors = {}, ip }: { value: Creds; onChange: (c: Creds) => void; errors?: CredErrors; ip?: boolean }) {
  const set = (p: Partial<Creds>) => onChange({ ...value, ...p });
  return (
    <div className="stack">
      <div className="fld-row">
        <TextField label={ip ? 'User Name' : 'Username'} placeholder="user@domain.com" value={value.user} error={errors.user ? ' ' : null} onChange={(v) => set({ user: v })} />
        <PasswordField label="Password" value={value.password} error={errors.password ? ' ' : null} onChange={(v) => set({ password: v })} />
      </div>
      <RadioGroup row ariaLabel="Domain" value={value.mode} onChange={(v) => set({ mode: v as Creds['mode'] })}
        options={[{ value: 'select', label: ip ? 'Domain/Workgroup' : 'Select Domain' }, { value: 'type', label: ip ? 'Type Domain/Workgroup' : 'Type Domain' }]} />
      {value.mode === 'select' ? (
        <SelectField label={ip ? 'Domain/Workgroup' : 'Select Domain'} placeholder="Select" options={DOMAINS} value={value.domain}
          error={errors.domain ? ' ' : null} onChange={(v) => set({ domain: v })} />
      ) : (
        <TextField label={ip ? 'Type Domain/Workgroup' : 'Type Domain'} placeholder="Type text" value={value.typed}
          error={errors.domain ? ' ' : null} onChange={(v) => set({ typed: v })} />
      )}
    </div>
  );
}
