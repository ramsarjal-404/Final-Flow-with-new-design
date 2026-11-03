import type { IndexedDocument, SearchQuery } from './store';
import { stamp } from './store';
import { searchedString, splitMatches } from './rules';

/* ENT-IDN-SearchExport [Prototype-only]: the file is generated in the browser and downloaded.
   Intended: generated server-side with the same content contract. */

export type ExportFormat = 'CSV' | 'PDF';
export type ExportInput = { caseName: string; query: Pick<SearchQuery, 'keys' | 'operator' | 'exact'>; docs: IndexedDocument[]; withContent: boolean };

export const exportName = (caseName: string, format: ExportFormat) =>
  `${caseName.replace(/[^A-Za-z0-9_-]+/g, '_')}${Date.now()}.${format.toLowerCase()}`;

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** CSV (CRLF): case line, searched string, created on, blank, then paths (and details). */
export function csvBlob({ caseName, query, docs, withContent }: ExportInput) {
  const lines = [`${caseName},,`, `${q(`Searched String : ${searchedString(query)}  `)},,`, `${q(`Created On: ${stamp()}`)},,`, ''];
  if (!withContent) {
    lines.push('Path', ...docs.map((d) => q(d.path)));
  } else {
    docs.forEach((d) => lines.push('Path', q(d.path), 'Details', q(d.content), ''));
  }
  return new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv' });
}

/* ---------- a small multi-page PDF writer (A4, Helvetica + Courier) ---------- */
const W = 595.28, H = 841.89, M = 48, CW = W - M * 2;
const ascii = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
  .replace(/…/g, '...').replace(/ /g, ' ').replace(/[^\x20-\x7e]/g, '?');
const pdfStr = (s: string) => ascii(s).replace(/[\\()]/g, (m) => '\\' + m);
const BODY = 9, CHAR = BODY * 0.6, LH = 13;
const PER_LINE = Math.floor(CW / CHAR);

function wrap(text: string, n = PER_LINE): string[] {
  const out: string[] = [];
  text.split('\n').forEach((para) => {
    let rest = ascii(para);
    if (!rest) { out.push(''); return; }
    while (rest.length > n) {
      let cut = rest.lastIndexOf(' ', n);
      if (cut < n * 0.5) cut = n;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut).replace(/^ /, '');
    }
    out.push(rest);
  });
  return out;
}

export function pdfBlob({ caseName, query, docs, withContent }: ExportInput) {
  const pages: string[][] = [];
  let ops: string[] = []; let y = 0;
  const newPage = () => {
    ops = []; pages.push(ops);
    // product wordmark header on every page
    ops.push(`0.11 0.27 0.6 rg BT /F2 16 Tf ${M} ${H - 46} Td (Lepide) Tj ET 0 0 0 rg`);
    ops.push(`0.88 0.9 0.93 RG 0.8 w ${M} ${H - 58} m ${W - M} ${H - 58} l S`);
    y = H - 84;
  };
  const need = (h: number) => { if (y - h < 64) newPage(); };
  const text = (font: string, size: number, x: number, s: string, rgb = '0.07 0.08 0.09') =>
    ops.push(`${rgb} rg BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfStr(s)}) Tj ET`);
  const band = (label: string) => {
    need(26);
    ops.push(`0.93 0.94 0.96 rg ${M} ${(y - 6).toFixed(2)} ${CW} 20 re f`);
    y += 0; text('F2', 9.5, M + 8, label); y -= 24;
  };
  const bodyLine = (line: string, highlight: boolean) => {
    need(LH);
    if (highlight) {
      let x = M;
      splitMatches(line, query).forEach((p) => {
        const w = p.t.length * CHAR;
        if (p.hit) ops.push(`1 0.88 0.45 rg ${x.toFixed(2)} ${(y - 2.5).toFixed(2)} ${w.toFixed(2)} ${LH - 2} re f`);
        x += w;
      });
    }
    text('F3', BODY, M, line, '0.2 0.22 0.25'); y -= LH;
  };

  newPage();
  for (const l of wrap(caseName, 60)) { text('F2', 14, M, l); y -= 20; }
  y -= 2;
  for (const l of wrap(`Searched String : ${searchedString(query)}`, 95)) { text('F1', 10, M, l, '0.25 0.27 0.3'); y -= 15; }
  text('F1', 10, M, `Created On: ${stamp()}`, '0.25 0.27 0.3'); y -= 26;

  if (!withContent) {
    band('Path');
    docs.forEach((d) => wrap(d.path).forEach((l) => bodyLine(l, false)));
  } else {
    docs.forEach((d, i) => {
      if (i) y -= 8;
      band(`Path: ${d.path}`);
      wrap(d.content).forEach((l) => bodyLine(l, true));
    });
  }

  // footers: "Total Records - N" (left) and "page / pages" (right)
  pages.forEach((p, i) => {
    const right = `${i + 1} / ${pages.length}`;
    p.push(`0.88 0.9 0.93 RG 0.8 w ${M} 46 m ${W - M} 46 l S`);
    p.push(`0.35 0.37 0.4 rg BT /F1 9 Tf ${M} 32 Td (${pdfStr(`Total Records - ${docs.length}`)}) Tj ET`);
    p.push(`0.35 0.37 0.4 rg BT /F3 9 Tf ${(W - M - right.length * 5.4).toFixed(2)} 32 Td (${pdfStr(right)}) Tj ET`);
  });

  const objs: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '', // pages, filled below
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
  ];
  const kids: number[] = [];
  pages.forEach((p) => {
    const stream = p.join('\n');
    const pageNo = objs.length + 1;
    kids.push(pageNo);
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${pageNo + 1} 0 R >>`);
    objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([out], { type: 'application/pdf' });
}
