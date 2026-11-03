import { useState } from 'react';
import { Icon } from '../ui';
import { countReports } from './store';
import type { CatalogFolder, CatalogNode, CatalogReportNode } from './types';

/* TreeNavigator for report folders (SCR-RLIB-01 "Tree behaviour", Lepide Design System 03 § 10). One folder open at a
   time (owned by the caller), groups expand independently, search opens every matching branch. */

export type ReportTreeProps = {
  folders: CatalogFolder[];
  /** Flat list shown under "All Reports" (every row, disabled included). */
  allNodes: CatalogReportNode[];
  /** Folder-row count (rows with that folderId). */
  countFor: (folderId: string) => number;
  pinned?: CatalogReportNode | null;
  activeId: string;
  openId: string | null;
  query: string;
  onFolder: (id: string) => void;
  onReport: (node: CatalogReportNode) => void;
  /** Accessible name of the tree. */
  label?: string;
  allLabel?: string;
  emptyFolderText?: string;
};

export const ALL_ID = 'all';

export function ReportTree({ folders, allNodes, countFor, pinned, activeId, openId, query, onFolder, onReport, label = 'Report folders', allLabel = 'All Reports', emptyFolderText = 'No reports in this folder yet.' }: ReportTreeProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();
  const match = (n: CatalogReportNode) => !q || n.name.toLowerCase().includes(q);
  const keep = (nodes: CatalogNode[]): CatalogNode[] => nodes.filter((n) => (n.kind === 'group' ? keep(n.children).length > 0 : match(n)));

  const report = (n: CatalogReportNode, key: string) => (
    <li key={key} role="none">
      <button type="button" role="treeitem" className={n.disabled ? 'off' : undefined} aria-disabled={n.disabled || undefined}
        data-tip={n.disabled ? `${n.name} (not available)` : n.name} onClick={() => !n.disabled && onReport(n)}>
        <Icon name="file" size={13} /><span>{n.name}</span>
      </button>
    </li>
  );
  const kids = (nodes: CatalogNode[], path: string) => nodes.map((n, i) => {
    const key = `${path}/${i}:${n.id}`;
    if (n.kind === 'report') return report(n, key);
    const inner = q ? keep(n.children) : n.children;
    if (q && !inner.length) return null;
    const open = q ? true : !!openGroups[key];
    return (
      <li key={key} role="none" className="grp">
        <button type="button" role="treeitem" aria-expanded={open} onClick={() => setOpenGroups((g) => ({ ...g, [key]: !g[key] }))}>
          <Icon name="chevron-right" size={12} className="sign" /><span>{n.name}</span><span className="n">{countReports(n.children)}</span>
        </button>
        {open && <ul role="group">{kids(inner, key)}</ul>}
      </li>
    );
  });

  const allShown = q ? allNodes.filter(match) : allNodes;
  const allOpen = q ? allShown.length > 0 : openId === ALL_ID;
  const showAll = !q || allShown.length > 0 || allLabel.toLowerCase().includes(q);
  const nothing = !!q && !showAll && !(pinned && match(pinned))
    && !folders.some((f) => keep(f.children).length > 0 || f.name.toLowerCase().includes(q));

  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="treeitem"]'));
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const el = items[i];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    } else if (e.key === 'ArrowRight' && el.getAttribute('aria-expanded') === 'false') { e.preventDefault(); el.click(); }
    else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (el.getAttribute('aria-expanded') === 'true') el.click();
      else el.closest('ul[role="group"]')?.parentElement?.querySelector<HTMLButtonElement>(':scope > button')?.focus();
    } else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
  };

  return (
    <ul className="tree" role="tree" aria-label={label} onKeyDown={onKeyDown}>
      {showAll && (
        <li role="none">
          <button type="button" role="treeitem" aria-current={activeId === ALL_ID ? 'true' : undefined} aria-selected={activeId === ALL_ID}
            aria-expanded={allOpen} onClick={() => onFolder(ALL_ID)}>
            <Icon name="folder" size={16} /><span>{allLabel}</span><span className="n">{allNodes.length}</span>
          </button>
          {allOpen && allShown.length > 0 && <ul role="group">{allShown.map((n, i) => report(n, `all/${i}:${n.id}`))}</ul>}
        </li>
      )}
      {pinned && match(pinned) && (
        <li role="none">
          <button type="button" role="treeitem" className="pinned" data-tip={pinned.name} onClick={() => onReport(pinned)}>
            <Icon name="star" size={14} /><span>{pinned.name}</span>
          </button>
        </li>
      )}
      {folders.map((f) => {
        const inner = q ? keep(f.children) : f.children;
        if (q && !inner.length && !f.name.toLowerCase().includes(q)) return null;
        const open = q ? inner.length > 0 : openId === f.id;
        return (
          <li key={f.id} role="none">
            <button type="button" role="treeitem" aria-current={activeId === f.id ? 'true' : undefined} aria-selected={activeId === f.id}
              aria-expanded={open} onClick={() => onFolder(f.id)}>
              <Icon name="chevron-right" size={14} className="sign" /><span>{f.name}{f.custom ? ' (custom)' : ''}</span><span className="n">{countFor(f.id)}</span>
            </button>
            {open && (inner.length
              ? <ul role="group">{kids(inner, f.id)}</ul>
              : <p className="rlib-tree-empty">{emptyFolderText}</p>)}
          </li>
        );
      })}
      {nothing && <li role="none"><p className="rlib-tree-empty" role="status">No reports match "{query.trim()}".</p></li>}
    </ul>
  );
}
