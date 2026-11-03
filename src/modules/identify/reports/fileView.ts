import fileViewJson from '../../../data/identifyFileView.json';

/* ENT-IDN-Pattern and ENT-IDN-FileViewContent (data-model.md). The 13 patterns are seed data; the values,
   the document body and the email body are functions of the selected pattern (not published: written here
   to the structure the spec fixes — document matches v1, v3, v8; email matches v1 (subject), v3, v7, v10, v8). */

export type Pattern = { name: string; count: number; prefix: string };
export const PATTERNS = (fileViewJson.exports as unknown as { PATTERNS: Pattern[] }).PATTERNS;

/** A text run: plain text or a highlighted match of a value. */
export type Segment = string | { match: string };
export type Block = { heading: string } | { text: Segment[] };
export type EmailContent = {
  subject: Segment[];
  meta: [string, string][];
  attachments: [string, string][];
  body: Block[];
  signature: string[];
};
export type FileViewContent = { values: string[]; document: Block[]; email: EmailContent };

/** v1 … v13 = `<prefix>` + 6-digit index. */
export const valuesOf = (p: Pattern) => Array.from({ length: 13 }, (_, i) => p.prefix + String(i + 1).padStart(6, '0'));

export function contentFor(p: Pattern): FileViewContent {
  const v = valuesOf(p);
  const m = (n: number) => ({ match: v[n - 1] });
  const document: Block[] = [
    { text: [
      `This report summarises the second-quarter internal audit of how ${p.name} records are collected, verified, stored and revoked on the HR and Finance file shares. The audit reviewed 12 sample records (No. `,
      m(1), ` – ${v[11]}) drawn from onboarding folders created between January and June.`,
    ] },
    { heading: 'Audit Findings Overview' },
    { text: ['Nine of the twelve records were complete and correctly retained. Three records showed control weaknesses, described below. None of the issues indicates an external disclosure, but each one increases the exposure of personal identifiers held on shared storage.'] },
    { heading: 'Verification Gaps:' },
    { text: [
      'Record No. ', m(3), ' was accepted on the strength of a scanned copy only: the original document was never sighted and no second reviewer signed off. ',
      `Record No. ${v[6]} carried an expiry date that had passed before onboarding was completed.`,
    ] },
    { heading: 'Revocation Documentation Issues:' },
    { text: [`When contractors left, their identifiers were not always withdrawn on time. Record No. ${v[9]} remained active for 46 days after the engagement ended, and its revocation form was never signed.`] },
    { heading: 'Audit-Log Deficiencies:' },
    { text: [
      'Access to the onboarding folder is logged, but the log does not show who copied record No. ', m(8),
      ' to a personal OneDrive location on 12 March. Log retention on this share is 30 days, shorter than the 90 days the policy requires.',
    ] },
    { heading: 'Root Cause Analysis' },
    { text: [`The checklist used by onboarding staff predates the current policy and has no step for sighting originals or for a second review. Revocation depends on a manual email from the line manager, which is easily missed. Record No. ${v[11]} shows the same pattern as ${v[3]}: both were processed by temporary staff during the March payroll peak.`] },
    { heading: 'Recommendations and Remediation Plan' },
    { text: ['Update the onboarding checklist to require an original-document check and a second reviewer before acceptance. Trigger revocation automatically from the HR leaver workflow. Extend log retention on the onboarding share to 90 days and alert on copies to personal storage. Re-run this audit on a fresh sample next quarter and report progress to the Data Protection Committee.'] },
  ];
  const email: EmailContent = {
    subject: [`Onboarding paperwork — ${p.name} on file (Ref `, m(1), ')'],
    meta: [
      ['From', 'Emma R. Walker <emma.walker@acme-hr.com>'],
      ['To', 'compliance-team@acme.com'],
      ['Cc', 'priya.shah@acme.com, benjamin.holt@acme.com'],
      ['Sent', 'Mon, 27 Apr 2026 09:14 AEST'],
    ],
    attachments: [['employee_form.pdf', '3 matches'], ['id_scan.jpg', '1 match']],
    body: [
      { text: ['Hi team,'] },
      { text: [
        `Please find attached the onboarding paperwork for the three new starters joining People & Culture on Monday. I have checked their ${p.name} details against the originals and the verified IDs are `,
        m(3), ', ', m(7), ' and ', m(10), '. The completed forms are in employee_form.pdf and the ID scan for the third starter is in id_scan.jpg.',
      ] },
      { text: ['One of the starters worked with us before under previous record ', m(8), '. Could compliance confirm whether that record should be archived or merged before payroll picks up the new one?'] },
      { text: ['Thanks,'] },
      { text: ['Emma'] },
    ],
    signature: ['Emma R. Walker · People & Culture, Acme Pty Ltd', 'Lvl 12, 100 Market St, Sydney NSW 2000 · +61 2 5550 0100'],
  };
  return { values: v, document, email };
}

/** Matched values in reading order (email: subject first, then body). */
export function matchesOf(c: FileViewContent, mode: 'document' | 'email'): string[] {
  const seg = (s: Segment[]) => s.flatMap((x) => (typeof x === 'string' ? [] : [x.match]));
  const blocks = (b: Block[]) => b.flatMap((x) => ('text' in x ? seg(x.text) : []));
  return mode === 'document' ? blocks(c.document) : [...seg(c.email.subject), ...blocks(c.email.body)];
}
