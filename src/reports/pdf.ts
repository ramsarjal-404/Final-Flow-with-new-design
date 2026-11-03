/* Minimal PDF writer for report exports (Helvetica / Helvetica-Bold, A4 landscape, text, rectangles,
   lines). Coordinates are top-left based; non-Latin-1 characters are replaced with "?". */

export type Rgb = [number, number, number];
type TextOpts = { size?: number; bold?: boolean; color?: Rgb };

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const PDF_INK = hex('#121417'), PDF_INK3 = hex('#5c6370'), PDF_BRAND = hex('#1f4fd1'), PDF_BAND = hex('#eef1f5'),
  PDF_BORDER = hex('#d9dde3'), PDF_DANGER = hex('#c0262d'), PDF_WARN = hex('#a15c00'), PDF_GOOD = hex('#1d7a55'), PDF_SOFT = hex('#f6f7f9');

const esc = (s: string) => s.replace(/[^\x20-\x7e\xa0-\xff]/g, '?').replace(/[\\()]/g, (m) => '\\' + m);
const c3 = (c: Rgb) => c.map((x) => x.toFixed(3)).join(' ');

/** Approximate Helvetica advance width (em) per character class. */
function charW(ch: string, bold: boolean) {
  if (/[ijl.,:;'|!]/.test(ch)) return 0.24;
  if (/[ftrI ()\[\]\-]/.test(ch)) return 0.32;
  if (/[mwMW]/.test(ch)) return bold ? 0.9 : 0.84;
  if (/[A-Z@%&]/.test(ch)) return bold ? 0.72 : 0.68;
  if (/[0-9]/.test(ch)) return 0.556;
  return bold ? 0.58 : 0.53;
}

export class PdfDoc {
  readonly width: number;
  readonly height: number;
  private pages: string[][] = [];
  private at = -1;
  constructor(landscape = true) { this.width = landscape ? 842 : 595; this.height = landscape ? 595 : 842; }

  get pageCount() { return this.pages.length; }
  addPage() { this.pages.push([]); this.at = this.pages.length - 1; return this.pages.length; }
  /** Continue drawing on page n (1-based) — used for "n / N" footers after layout. */
  goTo(n: number) { this.at = Math.max(0, Math.min(this.pages.length - 1, n - 1)); }
  private get cur() { if (!this.pages.length) this.addPage(); return this.pages[this.at]; }

  textWidth(s: string, size = 10, bold = false) { let w = 0; for (const ch of s) w += charW(ch, bold); return w * size; }

  text(x: number, y: number, s: string, o: TextOpts = {}) {
    const size = o.size ?? 10;
    this.cur.push(`BT /${o.bold ? 'F2' : 'F1'} ${size} Tf ${c3(o.color ?? PDF_INK)} rg ${x.toFixed(2)} ${(this.height - y - size).toFixed(2)} Td (${esc(s)}) Tj ET`);
  }
  rect(x: number, y: number, w: number, h: number, fill?: Rgb, stroke?: Rgb) {
    const ops = [`${x.toFixed(2)} ${(this.height - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`];
    if (fill && stroke) this.cur.push(`${c3(fill)} rg ${c3(stroke)} RG 0.6 w ${ops[0]} B`);
    else if (fill) this.cur.push(`${c3(fill)} rg ${ops[0]} f`);
    else if (stroke) this.cur.push(`${c3(stroke)} RG 0.6 w ${ops[0]} S`);
  }
  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = PDF_BORDER) {
    this.cur.push(`${c3(color)} RG 0.6 w ${x1.toFixed(2)} ${(this.height - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.height - y2).toFixed(2)} l S`);
  }

  /** Word-wrap to `max` width; long words are cut. `limit` lines at most (last line ends with "…"). */
  wrap(s: string, max: number, size = 10, bold = false, limit = Infinity): string[] {
    const out: string[] = [];
    let line = '';
    const push = (l: string) => { out.push(l); };
    for (const word of String(s).replace(/\s+/g, ' ').trim().split(' ')) {
      let w = word;
      while (this.textWidth(w, size, bold) > max) {
        let cut = w.length; while (cut > 1 && this.textWidth(w.slice(0, cut), size, bold) > max) cut--;
        if (line) { push(line); line = ''; }
        push(w.slice(0, cut)); w = w.slice(cut);
      }
      const next = line ? line + ' ' + w : w;
      if (this.textWidth(next, size, bold) > max) { push(line); line = w; } else line = next;
    }
    if (line) push(line);
    if (out.length > limit) { const cut = out.slice(0, limit); cut[limit - 1] = cut[limit - 1].replace(/.{0,3}$/, '...'); return cut; }
    return out.length ? out : [''];
  }

  blob(): Blob {
    const n = Math.max(1, this.pages.length);
    if (!this.pages.length) this.addPage();
    const objs: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
    const kids: number[] = [];
    // 3 = F1, 4 = F2, then per page: page obj + content obj
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    for (let i = 0; i < n; i++) {
      const stream = this.pages[i].join('\n');
      const pageNo = objs.length + 1; kids.push(pageNo);
      objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageNo + 1} 0 R >>`);
      objs.push(`<< /Length ${latin1Length(stream)} >>\nstream\n${stream}\nendstream`);
    }
    objs[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${n} >>`;
    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    objs.forEach((o, i) => { offsets.push(latin1Length(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = latin1Length(out);
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((x) => `${String(x).padStart(10, '0')} 00000 n \n`).join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: 'application/pdf' });
  }
}
const latin1Length = (s: string) => s.length;
