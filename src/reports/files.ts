import { PdfDoc, PDF_BAND, PDF_BORDER, PDF_BRAND, PDF_INK, PDF_INK3 } from './pdf';

/* CSV / PDF builders for the generic report view (DLG-RLIB-05). */

export const PRODUCT_NAME = 'Lepide Data Security Platform';

const p2 = (n: number) => String(n).padStart(2, '0');
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** `<title with non-word runs replaced by "_">_<YYYY-MM-DD>.<ext>` */
export const reportFileName = (title: string, ext: 'csv' | 'pdf') =>
  `${title.replace(/\W+/g, '_').replace(/^_+|_+$/g, '')}_${isoDay()}.${ext}`;

/** Every value double-quoted with inner quotes doubled. */
export const csvLine = (cells: string[]) => cells.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
export const csvBlob = (header: string[], rows: string[][]) =>
  new Blob([[csvLine(header), ...rows.map(csvLine)].join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Paginated landscape table PDF: product header; first page adds "Report Name - <title>", "Filters : <line>"
 * and "Duration : <range>" when present; a column header band on every page; cells wrapped to at most
 * four lines (empty cells "-"); footer "Total Records - <n>" and "<page> / <pages>" on every page.
 */
export function reportPdf({ title, filterLine, duration, columns, rows }: {
  title: string; filterLine?: string; duration?: string | null; columns: string[]; rows: string[][];
}): Blob {
  const doc = new PdfDoc(true);
  const M = 28, W = doc.width - M * 2, FOOT = doc.height - 26, SIZE = 7.2, LH = 9;
  const weights = columns.map((c) => (/(path|what|url|object name|email|site|description|query|message)/i.test(c) ? 2.2 : /(when|date|time)/i.test(c) ? 1.3 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / total) * W);
  let y = 0;
  const header = (first: boolean) => {
    doc.addPage();
    doc.rect(0, 0, doc.width, 30, PDF_BRAND);
    doc.text(M, 10, PRODUCT_NAME, { size: 10, bold: true, color: [1, 1, 1] });
    y = 44;
    if (first) {
      doc.text(M, y, 'Report Name - ', { size: 13, bold: true, color: PDF_INK3 });
      doc.text(M + doc.textWidth('Report Name - ', 13, true), y, title, { size: 13, bold: true }); y += 20;
      if (filterLine) for (const l of doc.wrap(`Filters : ${filterLine}`, W, 8.5)) { doc.text(M, y, l, { size: 8.5, color: PDF_INK3 }); y += 11; }
      if (duration) { doc.text(M, y, `Duration : ${duration}`, { size: 8.5, color: PDF_INK3 }); y += 11; }
      y += 6;
    }
    const lines = columns.map((c, i) => doc.wrap(c, widths[i] - 8, SIZE, true, 2));
    const h = Math.max(...lines.map((l) => l.length)) * LH + 8;
    doc.rect(M, y, W, h, PDF_BAND);
    let x = M;
    lines.forEach((ls, i) => { ls.forEach((l, j) => doc.text(x + 4, y + 4 + j * LH, l, { size: SIZE, bold: true })); x += widths[i]; });
    y += h;
  };
  header(true);
  for (const r of rows) {
    const lines = columns.map((_, i) => doc.wrap(r[i] && String(r[i]).trim() ? String(r[i]) : '-', widths[i] - 8, SIZE, false, 4));
    const h = Math.max(...lines.map((l) => l.length)) * LH + 8;
    if (y + h > FOOT - 8) header(false);
    let x = M;
    lines.forEach((ls, i) => { ls.forEach((l, j) => doc.text(x + 4, y + 4 + j * LH, l, { size: SIZE, color: PDF_INK })); x += widths[i]; });
    y += h;
    doc.line(M, y, M + W, y, PDF_BORDER);
  }
  const pages = doc.pageCount;
  for (let p = 1; p <= pages; p++) {
    doc.goTo(p);
    doc.text(M, FOOT, `Total Records - ${rows.length}`, { size: 8, color: PDF_INK3 });
    const t = `${p} / ${pages}`;
    doc.text(doc.width - M - doc.textWidth(t, 8), FOOT, t, { size: 8, color: PDF_INK3 });
  }
  return doc.blob();
}
