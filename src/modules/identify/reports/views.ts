import type { ReportViewData } from '../../../reports';

/* ENT-IDN-ClassifiedFileRow and the seven sibling Identify report views (data-model.md § report views).
   The original `identifyReportViews.ts` is not published: the rows are generated here from the rules of the
   data model (row i, 0-based). Every view: dateRange null, total = rows.length. */

export const FOLDER = 'C:\\Users\\dcm\\s\\Desktop\\share 2\\New folder\\2F\\2.2\\F2.3\\';
export const FILES = [
  'Employee list.docx', 'Payroll March.xlsx', 'Passport scans.pdf', 'HR onboarding.docx', 'Customer master.csv', 'Benefits enrolment.docx',
  'Tax returns 2024.pdf', 'Visa applications.docx', 'Contractors.xlsx', 'Medical claims.docx', 'Bank details.xlsx', 'Leave register.docx',
];
const COUNTS = [2207, 2208, 2209, 2210, 2211, 2212, 2213, 2214, 2215, 2216, 2026, 2027];
const RISK = [7, 12, 19, 23, 31, 45, 56, 63, 78, 89, 17, 20];
const VALUE = ['$5', '$6', '$7', '$8', '$9', '$10', '$11', '$12', '$13', '$14', '$15', '$20'];
const PREVIEW = [true, true, true, false, true, true, false, true, true, true, false, true];
const CONTENT = ['CCPA Religious Belief', 'GDPR Personal Data', 'US Passport Number', 'PCI Card Number'];
const COMPLIANCE = ['California Consumer Privacy Act', 'General Data Protection Regulation', 'HIPAA', 'PCI DSS'];
const MAILBOXES = ['emma.walker@acme.com', 'priya.shah@acme.com', 'noor.khan@acme.com', 'rashid.qureshi@acme.com', 'compliance-team@acme.com'];
const SUBJECTS = [
  'Onboarding paperwork — passport copies', 'Payroll corrections for March', 'Visa renewal documents',
  'Customer refund — card details', 'Benefits enrolment forms',
];
const REASONS = ['File is password protected', 'File size exceeds the scan limit', 'Unsupported file format', 'Access denied', 'File is corrupted'];
const SITES = ['https://acme.sharepoint.com/sites/HR', 'https://acme.sharepoint.com/sites/Finance', 'https://acme.sharepoint.com/sites/Legal'];

export const PREVIEW_YES = 'View file';
export const PREVIEW_NO = 'N/A';
export const CLASSIFIED_FILES = 'classified-files';

const p2 = (n: number) => String(n).padStart(2, '0');
/** `DD-07-2025 HH:MM:33 AM`, DD = 04 + i mod 3, HH = 09 + i mod 4, MM = 17 + i mod 40. */
const when = (i: number) => `${p2(4 + (i % 3))}-07-2025 ${p2(9 + (i % 4))}:${p2(17 + (i % 40))}:33 AM`;
const ext = (name: string) => name.slice(name.lastIndexOf('.') + 1).toUpperCase();
const gen = (n: number, row: (i: number) => (string | number)[]) => Array.from({ length: n }, (_, i) => row(i).map(String));

function view(columns: string[], filterFields: string[], defaultFilter: string, rows: string[][]): ReportViewData {
  return { columns, filterFields, defaultFilter, dateRange: null, total: rows.length, rows };
}

const FS = 'File Server(s) : [Equals [All]]';
const EX = 'Exchange Server(s) : [Equals [All]]';
const SP = 'SharePoint Online : [Equals [All]]';
const OD = 'OneDrive : [Equals [All]]';

function build(): Record<string, ReportViewData> {
  return {
    [CLASSIFIED_FILES]: view(
      ['File Server', 'File Path', 'Content Type(s)', 'Compliance', 'Count', 'Risk Level', 'Monetary Value', 'Classification Date Time', 'Preview'],
      ['File Server', 'File Path', 'Content Type(s)', 'Compliance', 'Risk Level'], FS,
      gen(100, (i) => {
        const k = i % 12;
        return [
          i % 5 === 4 ? '192.168.10.218' : '192.168.10.217', FOLDER + FILES[k],
          i < 12 ? CONTENT[0] : CONTENT[i % 4], i < 12 ? COMPLIANCE[0] : COMPLIANCE[i % 4],
          COUNTS[k], RISK[k], VALUE[k], i < 12 ? '04-07-2025 11:17:33 AM' : when(i), PREVIEW[k] ? PREVIEW_YES : PREVIEW_NO,
        ];
      })),
    'file-classification-failures': view(
      ['File Server', 'File Path', 'File Type', 'Failure Reason', 'Date Time'], ['File Server', 'File Path', 'Failure Reason'], FS,
      gen(40, (i) => ['192.168.10.217', FOLDER + FILES[i % 12], ext(FILES[i % 12]), REASONS[i % 5], when(i)])),
    'classified-emails': view(
      ['Mailbox', 'Subject', 'Sender', 'Content Type(s)', 'Compliance', 'Count', 'Risk Level', 'Monetary Value', 'Classification Date Time'],
      ['Mailbox', 'Subject', 'Sender', 'Content Type(s)', 'Compliance'], EX,
      gen(40, (i) => [MAILBOXES[i % 5], SUBJECTS[i % 5], MAILBOXES[(i + 2) % 5], CONTENT[i % 4], COMPLIANCE[i % 4], COUNTS[i % 12], RISK[i % 12], VALUE[i % 12], when(i)])),
    'email-classification-failures': view(
      ['Mailbox', 'Subject', 'Sender', 'Failure Reason', 'Date Time'], ['Mailbox', 'Subject', 'Failure Reason'], EX,
      gen(40, (i) => [MAILBOXES[i % 5], SUBJECTS[i % 5], MAILBOXES[(i + 1) % 5], REASONS[i % 5], when(i)])),
    'classified-sharepoint-objects': view(
      ['Site URL', 'Object Name', 'Object Type', 'Content Type(s)', 'Compliance', 'Count', 'Risk Level', 'Classification Date Time'],
      ['Site URL', 'Object Name', 'Content Type(s)', 'Compliance'], SP,
      gen(40, (i) => [SITES[i % 3], FILES[i % 12], i % 4 === 3 ? 'List Item' : 'Document', CONTENT[i % 4], COMPLIANCE[i % 4], COUNTS[i % 12], RISK[i % 12], when(i)])),
    'sharepoint-object-classification-failures': view(
      ['Site URL', 'Object Name', 'Failure Reason', 'Date Time'], ['Site URL', 'Object Name', 'Failure Reason'], SP,
      gen(40, (i) => [SITES[i % 3], FILES[(i + 3) % 12], REASONS[i % 5], when(i)])),
    'classified-onedrive-objects': view(
      ['Owner', 'File Path', 'Content Type(s)', 'Compliance', 'Count', 'Risk Level', 'Classification Date Time'],
      ['Owner', 'File Path', 'Content Type(s)', 'Compliance'], OD,
      gen(40, (i) => [MAILBOXES[i % 5], '/Documents/' + FILES[i % 12], CONTENT[i % 4], COMPLIANCE[i % 4], COUNTS[i % 12], RISK[i % 12], when(i)])),
    'onedrive-objects-classification-failures': view(
      ['Owner', 'File Path', 'Failure Reason', 'Date Time'], ['Owner', 'File Path', 'Failure Reason'], OD,
      gen(40, (i) => [MAILBOXES[i % 5], '/Documents/' + FILES[(i + 5) % 12], REASONS[i % 5], when(i)])),
  };
}

let cached: Record<string, ReportViewData> | null = null;
/** The eight Identify report views (generated once, then reused). */
export function identifyViews(): Record<string, ReportViewData> {
  if (!cached) cached = build();
  return cached;
}

/** File name = the part of a path after the last backslash (or slash). */
export const fileNameOf = (path: string) => path.slice(Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/')) + 1) || path;
