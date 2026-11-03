import { useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Icon, IconButton } from '../../ui';
import type { TreeNode } from './data';

/* TreePanel + read-only / selectable TreeNavigator (SCR-TRU-03 § 3, INT-TRU-023 … 026). Every node
   starts expanded. A node's toggle ("Expand <name>" / "Collapse <name>", Right / Left keys) opens or
   closes it; the label of a selectable node selects it (pressed state); the label of a non-selectable
   parent toggles it; a non-selectable leaf does nothing. */

const pathOf = (parent: string, n: TreeNode) => (parent ? parent + '/' : '') + n.name;
function allParents(n: TreeNode, parent = '', out = new Set<string>()) {
  const p = pathOf(parent, n);
  if (n.children?.length) { out.add(p); n.children.forEach((c) => allParents(c, p, out)); }
  return out;
}

export function TreeNav({ root, label, selected, onSelect, isSelectable, userMode }: {
  root: TreeNode; label: string; selected?: string | null;
  onSelect?: (path: string, node: TreeNode) => void;
  isSelectable?: (node: TreeNode, depth: number) => boolean;
  /** EPU: the root is a domain (folder icon); nodes below it are users (initial-letter avatar). */
  userMode?: boolean;
}) {
  const [open, setOpen] = useState(() => allParents(root));
  const toggle = (p: string) => setOpen((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });
  const setTo = (p: string, on: boolean) => setOpen((s) => { const n = new Set(s); if (on) n.add(p); else n.delete(p); return n; });

  const render = (n: TreeNode, parent: string, depth: number): ReactNode => {
    const p = pathOf(parent, n);
    const kids = n.children ?? [];
    const isOpen = open.has(p);
    const canSel = !!onSelect && (isSelectable ? isSelectable(n, depth) : !!n.selectable);
    const isSel = canSel && selected === p;
    const keys = (e: React.KeyboardEvent) => {
      if (!kids.length) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setTo(p, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setTo(p, false); }
    };
    const icon = userMode && depth > 0 ? <span aria-hidden="true" className="tru-tree__av"><Avatar name={n.name} size={22} /></span> : <Icon name="folder" size={14} />;
    const text = <><span className="tru-tree__name">{n.name}</span>{n.count && <span className="tru-tree__count">( {n.count} )</span>}</>;
    return (
      <li key={p}>
        <div className={'tru-tree__row' + (isSel ? ' is-sel' : '')} style={{ paddingLeft: depth * 16 }}>
          {kids.length ? (
            <button type="button" className="tree-toggle" aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${n.name}`}
              onClick={() => toggle(p)} onKeyDown={keys}><Icon name="chevron-right" size={14} /></button>
          ) : <span className="tree-spacer" aria-hidden="true" />}
          {canSel ? (
            <button type="button" className="tru-tree__label is-selectable" aria-pressed={isSel} onClick={() => onSelect!(p, n)} onKeyDown={keys}>{icon}{text}</button>
          ) : kids.length ? (
            <button type="button" className="tru-tree__label" aria-expanded={isOpen} onClick={() => toggle(p)} onKeyDown={keys}>{icon}{text}</button>
          ) : (
            <span className="tru-tree__label is-leaf">{icon}{text}</span>
          )}
        </div>
        {kids.length > 0 && isOpen && <ul className="tru-tree__group">{kids.map((c) => render(c, p, depth + 1))}</ul>}
      </li>
    );
  };

  return <ul className="tru-tree" aria-label={label}>{render(root, '', 0)}</ul>;
}

/** Tree pages: a TreePanel beside the tables, rendered only when `show` (status `ready`). */
export function TreeSplit({ title, show, tree, children }: { title: string; show: boolean; tree: ReactNode; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!show) return <div className="tru-main">{children}</div>;
  return (
    <div className={'tru-split' + (collapsed ? ' tru-split--collapsed' : '')}>
      {collapsed ? (
        <div className="lf-card tru-treecard tru-treecard--rail">
          <IconButton icon="chevron-right" label={`Show ${title}`} bordered aria-expanded={false} onClick={() => setCollapsed(false)} />
        </div>
      ) : (
        <section className="lf-card tru-treecard" aria-label={title}>
          <header className="tru-treecard__head">
            <h3>{title}</h3>
            <IconButton icon="chevron-left" label={`Hide ${title}`} bordered aria-expanded onClick={() => setCollapsed(true)} />
          </header>
          {tree}
        </section>
      )}
      <div className="tru-main">{children}</div>
    </div>
  );
}
