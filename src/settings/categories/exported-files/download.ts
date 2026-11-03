/* Real browser downloads for the prototype (SCR-SAD-09 Download, SCR-SAD-06 Export Database). */

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** CSV: `Report,Exported On` + one row. */
export const csvFile = (report: string, exportedOn: string) =>
  new Blob([`Report,Exported On\r\n${csvCell(report)},${csvCell(exportedOn)}\r\n`], { type: 'text/csv' });

/** A one-page PDF showing the report name. */
export function pdfFile(title: string) {
  const esc = (s: string) => s.replace(/[\\()]/g, (m) => '\\' + m).replace(/[^\x20-\x7e]/g, '?');
  const stream = `BT /F1 20 Tf 72 760 Td (${esc(title)}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([out], { type: 'application/pdf' });
}

/** An empty ZIP archive (end-of-central-directory record only). */
export function zipFile() {
  const b = new Uint8Array(22);
  b.set([0x50, 0x4b, 0x05, 0x06]);
  return new Blob([b], { type: 'application/zip' });
}

/** Pick the file body from the name's extension. */
export function fileFor(name: string, report: string, exportedOn: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return pdfFile(report);
  if (ext === 'zip') return zipFile();
  return csvFile(report, exportedOn);
}
