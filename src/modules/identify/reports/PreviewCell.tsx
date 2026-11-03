import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon } from '../../../ui';
import { CLASSIFIED_FILES, PREVIEW_YES, identifyViews } from './views';

/* SCR-IDN-02 Preview cell (INT-IDN-005 / 006). Lepide Design System 08 § 5: small secondary button "View file" (eye icon),
   or "N/A" in ink-4 with an info tooltip. */

export const FILE_VIEW_PATH = '/identify/reports/classified-files/file';
export const NO_PREVIEW_TIP = "This file can't be previewed here. Please contact your administrator to request access.";

/** ClassifiedFileState handed to SCR-IDN-03. */
export type ClassifiedFileState = { cells: string[]; columns: string[] };

/** A custom report may hide File Server / File Path: recover the full generated row from the visible cells. */
function fullRow(cells: string[], columns: string[]): ClassifiedFileState {
  const view = identifyViews()[CLASSIFIED_FILES];
  if (columns.includes('File Server') && columns.includes('File Path')) return { cells: [...cells], columns: [...columns] };
  const idx = columns.map((c) => view.columns.indexOf(c));
  const hit = view.rows.find((r) => idx.every((ci, n) => ci < 0 || r[ci] === cells[n]));
  return hit ? { cells: [...hit], columns: [...view.columns] } : { cells: [...cells], columns: [...columns] };
}

export function PreviewCell({ value, cells, columns }: { value: string; cells: string[]; columns: string[] }) {
  const nav = useNavigate();
  const tipId = useId();
  if (value === PREVIEW_YES) {
    return (
      <Button size="sm" icon="eye" className="idn-viewfile"
        onClick={(e) => { e.stopPropagation(); nav(FILE_VIEW_PATH, { state: fullRow(cells, columns) }); }}>
        View file
      </Button>
    );
  }
  return (
    <span className="idn-na">
      <span className="lf-na">{value || 'N/A'}</span>
      <button type="button" className="idn-why" aria-label="Why there is no preview" aria-describedby={tipId} data-tip={NO_PREVIEW_TIP}
        onClick={(e) => e.stopPropagation()}>
        <Icon name="info" size={14} />
      </button>
      <span id={tipId} hidden>{NO_PREVIEW_TIP}</span>
    </span>
  );
}
