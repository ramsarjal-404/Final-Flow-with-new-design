import { csvBlob, isoDay, PdfDoc, PRODUCT_NAME, PDF_BAND, PDF_BORDER, PDF_BRAND, PDF_DANGER, PDF_GOOD, PDF_INK, PDF_INK3, PDF_SOFT, PDF_WARN } from '../../reports';

/* DLG-AUD-02 output contracts (modules/auditor/screens.md): CSV / PDF of the Copilot report. */

export type CopilotTurn = { role: 'user' | 'bot'; text: string; sectionTitle?: string; points?: string[] };
/** ENT-AUD-CopilotRow. */
export type CopilotRow = {
  user: string; email: string; file: string; path: string; label: string; query: string; what: string; when: string; from: string; tenant: string;
  turns: CopilotTurn[];
};
export type Risk = 'HIGH' | 'MED' | 'LOW';

/** Risk tier from the sensitivity label. */
export function riskOf(label: string): Risk {
  const l = label.toLowerCase();
  if (/(highly|confidential|sensitive)/.test(l)) return 'HIGH';
  if (/(label|default)/.test(l)) return 'MED';
  return 'LOW';
}
/** SharePoint URL parameters tempauth, UniqueId, sourcedoc and token → [redacted]. */
export const maskUrl = (url: string) => url.replace(/([?&](?:tempauth|uniqueid|sourcedoc|token)=)[^&]*/gi, '$1[redacted]');
/** Strip inline markup and collapse whitespace. */
export const plain = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export const copilotFileName = (ext: 'csv' | 'pdf') => `Data_Accessed_by_Copilot_${isoDay()}.${ext}`;

export function copilotCsv(rows: CopilotRow[], withConversation: boolean): Blob {
  if (withConversation) {
    const header = ['User', 'When', 'Risk', 'Sensitivity', 'File', 'Path', 'Tenant', 'Origin', 'Prompt', 'Copilot Response'];
    return csvBlob(header, rows.map((r) => {
      const bot = r.turns.find((t) => t.role === 'bot');
      const resp = bot ? plain([bot.text, bot.sectionTitle ?? '', ...(bot.points ?? [])].join(' ')).slice(0, 500) : '';
      return [r.user, r.when, riskOf(r.label), r.label, r.file, maskUrl(r.path), r.tenant, r.from, r.query, resp].map(plain);
    }));
  }
  return csvBlob(['User', 'When', 'Sensitivity', 'File', 'Path', 'Tenant', 'Origin'],
    rows.map((r) => [r.user, r.when, r.label, r.file, maskUrl(r.path), r.tenant, r.from].map(plain)));
}

const p2 = (n: number) => String(n).padStart(2, '0');
const createdOn = (d = new Date()) => {
  const h = d.getHours() % 12 || 12;
  return `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()} ${p2(h)}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
};

/** One landscape page per row (risk badge, "What:" sentence, optional conversation, citations footer). */
export function copilotPdf(rows: CopilotRow[], withConversation: boolean, duration: string): Blob {
  const doc = new PdfDoc(true);
  const M = 30, W = doc.width - M * 2, FOOT = doc.height - 28;
  const created = createdOn();
  const cols = ['User Name', 'Email ID', 'File Name', 'File URL', 'Sensitivity Label', 'Search Query', 'When', 'From', 'Tenant Name'];
  const weights = [1, 1.5, 1.3, 2.4, 1.1, 1.5, 1.1, 0.6, 1.5];
  const tw = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / tw) * W);
  rows.forEach((r, n) => {
    doc.addPage();
    doc.rect(0, 0, doc.width, 30, PDF_BRAND);
    doc.text(M, 10, PRODUCT_NAME, { size: 10, bold: true, color: [1, 1, 1] });
    let y = 42;
    doc.text(M, y, 'Data Accessed by Copilot', { size: 15, bold: true });
    const co = `Created On: ${created}`;
    doc.text(doc.width - M - doc.textWidth(co, 8.5), y + 4, co, { size: 8.5, color: PDF_INK3 });
    y += 24;
    doc.rect(M, y, W, 32, PDF_SOFT, PDF_BORDER);
    doc.text(M + 10, y + 6, `Duration: (${duration})`, { size: 8.5, color: PDF_INK3 });
    doc.text(M + 10, y + 18, `AND Tenant Name: [Equals [${r.tenant}]]`, { size: 8.5, color: PDF_INK3 });
    y += 42;
    // row table
    const cells = [r.user, r.email, r.file, maskUrl(r.path), r.label && r.label !== 'N/A' ? r.label : 'Label 1', r.query.endsWith('?') ? r.query : r.query + '?', r.when, r.from, r.tenant];
    const hl = cols.map((c, i) => doc.wrap(c, widths[i] - 8, 7.5, true, 2));
    const hh = Math.max(...hl.map((l) => l.length)) * 9 + 8;
    doc.rect(M, y, W, hh, PDF_BAND);
    let x = M; hl.forEach((ls, i) => { ls.forEach((l, j) => doc.text(x + 4, y + 4 + j * 9, l, { size: 7.5, bold: true })); x += widths[i]; });
    y += hh;
    const bl = cells.map((c, i) => doc.wrap(c || '-', widths[i] - 8, 7.5, false, 5));
    const bh = Math.max(...bl.map((l) => l.length)) * 9 + 8;
    x = M; bl.forEach((ls, i) => { ls.forEach((l, j) => doc.text(x + 4, y + 4 + j * 9, l, { size: 7.5 })); x += widths[i]; });
    y += bh; doc.line(M, y, M + W, y);
    y += 12;
    // risk badge + What
    const risk = riskOf(r.label);
    const tone = risk === 'HIGH' ? PDF_DANGER : risk === 'MED' ? PDF_WARN : PDF_GOOD;
    const badge = `RISK: ${risk}`;
    doc.rect(M, y, doc.textWidth(badge, 8, true) + 14, 16, tone);
    doc.text(M + 7, y + 4, badge, { size: 8, bold: true, color: [1, 1, 1] });
    y += 24;
    const what = `What: ${r.user} read the file '${r.file}' from the link '${maskUrl(r.path)}' which has a sensitivity label of '${r.label || 'N/A'}'.`;
    for (const l of doc.wrap(what, W, 9)) { doc.text(M, y, l, { size: 9 }); y += 12; }
    y += 6;
    if (withConversation) {
      doc.text(M, y, 'Copilot Conversation', { size: 11, bold: true }); y += 16;
      const sender = (t: CopilotTurn) => (t.role === 'user' ? r.user.toUpperCase().replace(/\s+/g, '_') : 'COPILOT');
      outer: for (const t of r.turns) {
        const body = plain([t.text, t.sectionTitle ?? '', ...(t.points ?? []).map((p, i) => `${i + 1}. ${p}`)].join(' '));
        if (y + 22 > FOOT - 14) break;
        doc.text(M, y, sender(t), { size: 7.5, bold: true, color: t.role === 'user' ? PDF_INK3 : PDF_BRAND }); y += 11;
        for (const l of doc.wrap(body, W - 10, 8.5)) {
          if (y + 11 > FOOT - 14) break outer;
          doc.text(M + 10, y, l, { size: 8.5, color: PDF_INK }); y += 11;
        }
        y += 5;
      }
    }
    doc.line(M, FOOT - 6, M + W, FOOT - 6);
    doc.text(M, FOOT, `Citations: [1] ${r.file} | Tenant: ${r.tenant}`, { size: 8, color: PDF_INK3 });
    const pg = `${n + 1} / ${rows.length}`;
    doc.text(doc.width - M - doc.textWidth(pg, 8), FOOT, pg, { size: 8, color: PDF_INK3 });
  });
  return doc.blob();
}
