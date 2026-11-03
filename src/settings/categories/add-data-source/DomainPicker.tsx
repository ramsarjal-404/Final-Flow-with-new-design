import { useState } from 'react';
import { Button, Icon, Modal, PasswordField, RadioGroup, SelectField, TextField, useToast } from '../../../ui';
import { CURRENT_USER, DOMAINS, DOMAIN_COMPUTERS, DOMAIN_OUS, DOMAIN_USERS } from './store';
import type { DomainObject } from './store';

/* DLG-SDS-05 Domain object picker. Mount with a fresh `key` on every open (opening resets everything). */
export type PickKind = 'computers' | 'ou' | 'users';
const TITLE: Record<PickKind, string> = { computers: 'Add File Server from Domain', ou: 'Add File Server from OU', users: 'Add Users from Domain' };

export default function DomainPicker({ kind, multi, title, onClose, onDone }: {
  kind: PickKind; multi: boolean; title?: string; onClose: () => void; onDone: (objs: DomainObject[], domain: string) => void;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<'type' | 'select'>('select');
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState(DOMAINS[1] ?? DOMAINS[0]);
  const [found, setFound] = useState<DomainObject[] | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [filters, setFilters] = useState({ name: '', objectClass: '', dn: '' });
  const domain = mode === 'type' ? typed.trim() : picked;

  const find = () => {
    if (mode === 'type' && !typed.trim()) { toast({ variant: 'error', title: 'Domain required', message: 'Type a domain or select one, then click Find.' }); return; }
    setFound(kind === 'computers' ? DOMAIN_COMPUTERS : kind === 'users' ? DOMAIN_USERS : DOMAIN_OUS);
    setSel([]);
  };
  const rows = (found ?? []).filter((o) => (Object.keys(filters) as (keyof typeof filters)[])
    .every((k) => !filters[k] || String(o[k]).toLowerCase().includes(filters[k].toLowerCase())));
  const toggle = (n: string) => setSel((s) => (multi ? (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]) : s.includes(n) ? [] : [n]));
  const done = () => {
    if (!found) { toast({ variant: 'error', title: 'Nothing selected', message: 'Click Find to list the domain objects.' }); return; }
    if (!sel.length) { toast({ variant: 'error', title: 'Nothing selected', message: 'Click a row to select it.' }); return; }
    onDone(found.filter((o) => sel.includes(o.name)), domain);
  };

  return (
    <Modal open onClose={onClose} title={title ?? TITLE[kind]} icon="search" size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <div className="add-data-source-two">
        <TextField label="Username" value={CURRENT_USER} disabled aria-label="Username (current user)" />
        <PasswordField label="Password" value="••••••••" disabled aria-label="Password (current user)" />
      </div>
      <RadioGroup row ariaLabel="Domain" value={mode} onChange={(v) => setMode(v as 'type' | 'select')}
        options={[{ value: 'type', label: 'Type Domain' }, { value: 'select', label: 'Select Domain' }]} />
      <div className="add-data-source-inline">
        <TextField value={typed} placeholder="Type Domain" maxLength={256} aria-label="Type Domain"
          onChange={(v) => { setTyped(v); setMode('type'); }} />
        <SelectField value={picked} options={DOMAINS} aria-label="Select Domain" onChange={(v) => { setPicked(v); setMode('select'); }} />
        <Button icon="search" onClick={find}>Find</Button>
      </div>
      <section className="lf-card tablecard tablecard--flat tablecard--static add-data-source-mini">
        <div className="tbl-wrap">
          <table className="lf-table lf-table--auto" aria-label="Domain objects" aria-multiselectable={multi || undefined}>
            <thead>
              <tr><th>Name</th><th>Object Class</th><th>Distinguished Name</th></tr>
              {found && (
                <tr className="filter-row">
                  {(['name', 'objectClass', 'dn'] as const).map((k) => (
                    <th key={k}>
                      <span className={'filter-input' + (filters[k] ? ' has-value' : '')}><Icon name="search" size={12} />
                        <input value={filters[k]} placeholder="Filter" aria-label={`Filter ${k}`} maxLength={200}
                          onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))} /></span>
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {!found ? (
                <tr className="add-data-source-empty-row"><td colSpan={3}>Click Find to list the domain objects.</td></tr>
              ) : rows.length === 0 ? (
                <tr className="add-data-source-empty-row"><td colSpan={3}>No results match your search or filters.</td></tr>
              ) : rows.map((o) => (
                <tr key={o.name} className="lf-row add-data-source-sel-row" tabIndex={0} aria-selected={sel.includes(o.name)}
                  onClick={() => toggle(o.name)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(o.name); } }}>
                  <td>{o.name}</td><td>{o.objectClass}</td><td title={o.dn}>{o.dn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Modal>
  );
}
