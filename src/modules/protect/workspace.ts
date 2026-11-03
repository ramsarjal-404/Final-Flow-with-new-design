/* Deterministic AD Cleaner workspace populations (data-model.md "Workspace rows"). Counts reconcile with the
   analytics seed: 412 inactive accounts, 22 in deletion review = 180d+, 137 never logged on, 8 deletions in 30 days. */
import { AD, BUCKETS, G_QUARANTINE, STAGES, WS_OUS, addDays, hashStr, pad, rng, shortDate, type ViewKey } from './data';

export type TypeKey = 'all' | 'users' | 'computers';
export type Params = Record<string, string>;
const TYPES: ('users' | 'computers')[] = ['users', 'computers'];
const typesOf = (t?: string): ('users' | 'computers')[] => (t === 'users' || t === 'computers' ? [t] : TYPES);
const TODAY = new Date();
const when = (d: number, time = '13:30') => `${shortDate(addDays(d, TODAY))}, ${time}`;

/* ------------------------------------------------------------------ accounts */
export type AccountRow = { name: string; type: 'User' | 'Computer'; tkey: 'users' | 'computers'; bucket: string; days: number; stage: string; ou: string; never: boolean; last: string; next: string; status: string };
const FIRST = ['adam', 'bella', 'chris', 'dina', 'eric', 'fiona', 'george', 'hana', 'ivan', 'julia', 'kevin', 'lara', 'marco', 'nina', 'oscar', 'paula', 'quinn', 'rosa', 'sam', 'tara', 'umar', 'vera', 'will', 'xena', 'yusuf', 'zoe'];
const LAST = ['adams', 'baker', 'clark', 'diaz', 'evans', 'fox', 'gray', 'hill', 'irwin', 'jones', 'khan', 'lee', 'moore', 'nash', 'owen', 'park', 'reid', 'shaw', 'tan', 'vance', 'wood', 'young'];
const BUCKET_RANGE: [number, number][] = [[20, 39], [40, 59], [60, 89], [90, 179], [180, 420]];
const OU_W: Record<'users' | 'computers', number[]> = { users: [0.36, 0.06, 0.2, 0.12, 0.26], computers: [0.04, 0.58, 0.06, 0.14, 0.18] };
const NEXT: Record<string, [string, number]> = { 'Password reset': ['Disable', 40], Disabled: ['Move to OU', 60], 'Moved to OU': ['Deletion review', 180] };

export const ACCOUNT_ROWS: AccountRow[] = (() => {
  const out: AccountRow[] = [];
  for (const t of TYPES) {
    const r = rng(t === 'users' ? 11 : 29);
    const buckets: number[] = []; AD.age[t].forEach((n, b) => { for (let i = 0; i < n; i++) buckets.push(b); });
    const stages: number[] = []; AD.lifecycle[t].forEach((n, s) => { for (let i = 0; i < n; i++) stages.push(s); });
    const neverN = AD.never[t]; const step = buckets.length / neverN;
    const neverIdx = new Set(Array.from({ length: neverN }, (_, i) => Math.floor(i * step)));
    buckets.forEach((b, i) => {
      const [lo, hi] = BUCKET_RANGE[b]; const days = lo + Math.floor(r() * (hi - lo + 1));
      let x = r(); let ou = 0; while (ou < 4 && x > OU_W[t][ou]) { x -= OU_W[t][ou]; ou++; }
      const stage = STAGES[stages[i]]; const never = neverIdx.has(i);
      const name = t === 'users' ? `${FIRST[i % FIRST.length]}.${LAST[(i * 7 + 3) % LAST.length]}${i >= FIRST.length ? i : ''}` : `${['WKSTN', 'LAPTOP', 'SVR', 'KIOSK'][i % 4]}-${pad(100 + i)}$`;
      const nx = NEXT[stage];
      const next = nx ? `${nx[0]} on ${shortDate(addDays(Math.max(1, nx[1] - days), TODAY))}` : 'Delete on the next run once activated';
      const k = i % 37;
      out.push({ name, type: t === 'users' ? 'User' : 'Computer', tkey: t, bucket: BUCKETS[b], days, stage, ou: WS_OUS[ou], never,
        last: never ? 'Never logon' : shortDate(addDays(-days, TODAY)), next, status: k === 5 ? 'Protected' : k === 17 || k === 29 ? 'Excluded' : 'In scope' });
    });
  }
  return out;
})();
export const accountsFor = (type?: string) => ACCOUNT_ROWS.filter((a) => typesOf(type).includes(a.tkey));
/** Dormant accounts by OU × stage for a type, OUs sorted by total. */
export function ouMatrix(type: string) {
  const rows = WS_OUS.map((ou) => {
    const counts = STAGES.map((s) => accountsFor(type).filter((a) => a.ou === ou && a.stage === s).length);
    return { ou, counts, total: counts.reduce((a, b) => a + b, 0) };
  });
  return rows.sort((a, b) => b.total - a.total);
}

/* ------------------------------------------------------------------ schedule */
export type ScheduleRow = { date: string; day: number; account: string; action: string; ou: string; policy: string; notify: string; state: string; tkey: 'users' | 'computers' };
const dueDay = (s: string) => Number(/(\d+)/.exec(s)?.[1] ?? 1);
export const SCHEDULE_ROWS: ScheduleRow[] = (() => {
  const out: ScheduleRow[] = []; let k = 0;
  AD.upcoming.labels.forEach((action, a) => {
    for (const t of TYPES) {
      const n30 = AD.upcoming.d30[t][a]; const n90 = AD.upcoming.d90[t][a]; const d0 = dueDay(AD.upcoming.due30[a]);
      const pool = accountsFor(t);
      for (let i = 0; i < n90; i++) {
        const day = i < n30 ? d0 + Math.floor((i * (30 - d0)) / Math.max(1, n30)) : 31 + Math.floor(((i - n30) * 59) / Math.max(1, n90 - n30));
        const acc = pool[(i * 13 + a * 31) % pool.length]; k++;
        const state = action === 'Delete' ? 'Review required' : day <= 2 ? 'Queued' : k % 19 === 0 ? 'Blocked' : 'Scheduled';
        out.push({ date: when(day), day, account: acc.name, action, ou: acc.ou, policy: 'Inactive account lifecycle', notify: k % 5 === 0 ? 'Suppressed' : 'Administrator', state, tkey: t });
      }
    }
  });
  return out.sort((x, y) => x.day - y.day);
})();
/** Upcoming card for a window: counts per action, due text, queued total. */
export function upcoming(type: string, range: number, win: number) {
  return AD.upcoming.labels.map((label, a) => {
    const rows = SCHEDULE_ROWS.filter((r) => r.action === label && typesOf(type).includes(r.tkey) && r.day <= win);
    const seedDue = (range === 30 ? AD.upcoming.due30 : AD.upcoming.due90)[a];
    const due = win === range ? seedDue : rows.length ? `in ${rows[0].day} day${rows[0].day === 1 ? '' : 's'}` : 'none due';
    return { label, count: rows.length, due };
  });
}

/* ------------------------------------------------------------------ activity */
export type ActivityRow = { date: string; label: string; event: string; account: string; ou: string; policy: string; result: string; detail: string; tkey: 'users' | 'computers' };
const FAILED: Record<'d30' | 'd90', Record<'users' | 'computers', number>> = { d30: { users: 4, computers: 2 }, d90: { users: 10, computers: 4 } };
const trendOf = (range: number) => AD.trend[range === 90 ? 'd90' : 'd30'];
export const lastOf = (xs: number[]) => xs[xs.length - 1];
export function trendTotals(type: string, range: number) {
  const tr = trendOf(range); const ts = typesOf(type);
  const detected = ts.reduce((s, t) => s + lastOf(tr.detected[t]), 0);
  const remediated = ts.reduce((s, t) => s + lastOf(tr.remediated[t]), 0);
  const failed = ts.reduce((s, t) => s + FAILED[range === 90 ? 'd90' : 'd30'][t], 0);
  return { detected, remediated, failed };
}
export function activityRows(range: number): ActivityRow[] {
  const tr = trendOf(range); const out: ActivityRow[] = []; let k = 0;
  tr.labels.forEach((label, i) => {
    for (const t of TYPES) {
      const pool = accountsFor(t);
      const per: [string, number][] = [['Detected', 2], ['Remediated', 2], ['Failed', i % 3 === 1 ? 1 : 0]];
      for (const [event, n] of per) for (let j = 0; j < n; j++) {
        const acc = pool[(k * 17 + i * 5) % pool.length]; k++;
        out.push({ date: `${label}, ${pad(9 + ((k * 3) % 9))}:${pad((k * 7) % 60)}`, label, event, account: acc.name, ou: acc.ou, policy: 'Inactive account lifecycle',
          result: event === 'Detected' ? 'Matched' : event === 'Remediated' ? 'Completed' : 'Blocked',
          detail: event === 'Detected' ? `Inactive ${acc.days} days` : event === 'Remediated' ? `${acc.stage === 'Password reset' ? 'Password reset' : acc.stage} applied` : 'Account is protected by an exclusion', tkey: t });
      }
    }
  });
  return out.reverse();
}
/** True total behind an activity drill (the table shows a sample). */
export function activityTotal(p: Params, range: number) {
  const tr = trendOf(range); const ts = typesOf(p.type); const i = p.date ? tr.labels.indexOf(p.date) : -1;
  const f = FAILED[range === 90 ? 'd90' : 'd30'];
  const val = (series: 'detected' | 'remediated') => ts.reduce((s, t) => s + (i >= 0 ? tr[series][t][i] : lastOf(tr[series][t])), 0);
  const failed = i >= 0 ? (i % 3 === 1 ? ts.length : 0) : ts.reduce((s, t) => s + f[t], 0);
  if (p.series === 'detected' || p.series === 'remediated') return val(p.series);
  return val('detected') + val('remediated') + failed;
}

/* ------------------------------------------------------------------ runs */
export type RunRow = { date: string; day: number; policy: string; duration: string; matched: number; succeeded: number; failed: number; status: string; report: 'report' | 'none' };
export const RUN_ROWS: RunRow[] = (() => {
  const out: RunRow[] = []; const r = rng(7);
  const policies = ['Inactive account lifecycle', 'Leaver account quarantine', 'Dormant privileged accounts'];
  for (let q = 1; q <= 3; q++) out.push({ date: when(q, '02:00'), day: -q, policy: policies[q - 1], duration: 'Not started', matched: 0, succeeded: 0, failed: 0, status: 'Queued', report: 'none' });
  for (let d = 0; d < 90; d++) {
    const status = d === 6 || d === 41 || d === 63 || d === 77 ? 'Failed' : d === 18 || d === 55 ? 'Blocked' : 'Completed';
    if (d >= 30 && d % 3 !== 0 && status === 'Completed' && d % 2 === 0) continue;
    const matched = 10 + Math.floor(r() * 30);
    const failed = status === 'Completed' ? Math.floor(r() * 2) : status === 'Failed' ? matched : matched;
    out.push({ date: when(-d - 1, '13:30'), day: d + 1, policy: policies[d % 3], duration: status === 'Blocked' ? 'Awaiting review' : `${1 + Math.floor(r() * 4)}m ${pad(Math.floor(r() * 60))}s`,
      matched, succeeded: status === 'Completed' ? matched - failed : 0, failed, status, report: status === 'Completed' ? 'report' : 'none' });
  }
  return out;
})();
/** Exact 30-day mix: 28 Completed / 1 Failed / 1 Blocked / 3 Queued. */
export const runsFor = (range: number) => {
  const inRange = RUN_ROWS.filter((x) => x.day <= range);
  if (range !== 30) return inRange;
  const completed = inRange.filter((x) => x.status === 'Completed').slice(0, 28);
  return inRange.filter((x) => x.status !== 'Completed' || completed.includes(x));
};

/* ------------------------------------------------------------------ empty groups */
export type GroupRow = { name: string; type: 'Security' | 'Distribution'; scope: string; ou: string; home: string; dn: string; created: string; days: number | null; stage: string; next: string; status: string };
const GROUP_NAMES = ['SG-Finance-Readers', 'DL-Marketing-Events', 'SG-HR-Archive', 'SG-Legacy-CRM', 'DL-London-Office', 'SG-VPN-Contractors', 'SG-Print-Floor3', 'DL-Project-Orion',
  'SG-SQL-Admins-Old', 'SG-Training-2023', 'DL-Sales-EMEA', 'SG-Share-Legal', 'SG-App-Payroll', 'DL-All-Interns', 'SG-Dev-Sandbox', 'SG-Kiosk-Users', 'DL-Board-Updates', 'SG-Backup-Ops',
  'SG-Wifi-Guests', 'DL-Partners-Apac'];
const HOMES = ['Groups', 'Projects', 'Departments', 'Distribution Lists', 'Legacy Applications', 'IT', 'Training', 'Users'];
export function stageFor(days: number) { return days < 7 ? 'Not yet reported' : days < 30 ? 'Reported' : days < 60 ? 'Quarantined' : 'Eligible for deletion'; }
export function groupsFor(domain: string): GroupRow[] {
  const r = rng(hashStr(domain)); const dc = domain.split('.').map((p) => 'DC=' + p).join(',');
  const rows: GroupRow[] = GROUP_NAMES.map((name, i) => {
    const days = i === 0 ? 20 : i === 1 ? 45 : i === 2 ? 70 : Math.floor(r() * 110);
    const home = HOMES[Math.floor(r() * HOMES.length)]; const stage = stageFor(days); const ou = stage === 'Quarantined' ? G_QUARANTINE : home;
    const next = stage === 'Not yet reported' ? `Reported on ${shortDate(addDays(7 - days, TODAY))}` : stage === 'Reported' ? `Quarantine on ${shortDate(addDays(30 - days, TODAY))}`
      : stage === 'Quarantined' ? `Delete on ${shortDate(addDays(60 - days, TODAY))} if deletion is on` : 'Deleted on the next run if deletion is on';
    return { name, type: name.startsWith('DL-') ? 'Distribution' : 'Security', scope: ['Global', 'Domain local', 'Universal'][i % 3], ou, home, dn: `CN=${name},OU=${ou},${dc}`,
      created: shortDate(addDays(-(days + 30 + Math.floor(r() * 400)), TODAY)), days, stage, next, status: 'In scope' };
  });
  const guard = (name: string, scope: string, days: number | null, stage: string, next: string, status: string, home = 'Users'): GroupRow =>
    ({ name, type: 'Security', scope, ou: home, home, dn: `CN=${name},CN=${home},${dc}`, created: shortDate(addDays(-900, TODAY)), days, stage, next, status });
  return [...rows,
    guard('Enterprise Key Admins', 'Universal', 12, 'Reported', 'Built-in group — never actioned', 'Protected'),
    guard('DnsUpdateProxy', 'Global', 3, 'Not yet reported', 'Built-in group — never actioned', 'Protected'),
    guard('Domain Users', 'Global', null, 'Not empty', 'Members through primary group', 'Excluded'),
    guard('SG-Project-Lepide Design System-All', 'Universal', null, 'Not empty', 'Only contains empty groups — not treated as empty', 'Excluded', 'Projects'),
  ];
}

/* ------------------------------------------------------------------ filtering */
export const CHIP_LABEL: Record<string, string> = {
  type: 'Account type', range: 'Reporting window', stage: 'Lifecycle stage', ou: 'Organizational Unit', bucket: 'Inactivity', series: 'Event', date: 'Date',
  action: 'Action', status: 'Run status', group: 'View', never: 'Account filter', posture: 'Account state', gtype: 'Group type',
};
export function chipValue(k: string, v: string) {
  if (k === 'type') return v === 'users' ? 'Users' : v === 'computers' ? 'Computers' : 'All accounts';
  if (k === 'range') return `${v} days`;
  if (k === 'group') return 'Grouped by OU';
  if (k === 'never') return 'Never logged on';
  if (k === 'posture') return v === 'enabled' ? 'Still enabled' : 'Contained';
  if (k === 'series') return v === 'detected' ? 'Detected' : 'Remediated';
  if (k === 'gtype') return v === 'security' ? 'Security' : 'Distribution';
  return v;
}

export function viewRows(tab: ViewKey, p: Params): { rows: (AccountRow | ScheduleRow | ActivityRow | RunRow | GroupRow)[]; total: number } {
  const range = p.range === '90' ? 90 : 30;
  if (tab === 'accounts') {
    let xs = accountsFor(p.type);
    if (p.stage) xs = xs.filter((a) => a.stage === p.stage);
    if (p.ou) xs = xs.filter((a) => a.ou === p.ou);
    if (p.never === '1') xs = xs.filter((a) => a.never);
    if (p.bucket) xs = xs.filter((a) => a.bucket === p.bucket);
    if (p.posture) xs = xs.filter((a) => (p.posture === 'enabled') === (a.stage === 'Password reset'));
    if (p.group === 'ou') xs = [...xs].sort((a, b) => a.ou.localeCompare(b.ou) || b.days - a.days);
    else if (p.sort === 'inactive-desc') xs = [...xs].sort((a, b) => b.days - a.days);
    return { rows: xs, total: xs.length };
  }
  if (tab === 'schedule') {
    let xs = SCHEDULE_ROWS.filter((r) => r.day <= range && typesOf(p.type).includes(r.tkey));
    if (p.action) xs = xs.filter((r) => r.action === p.action);
    return { rows: xs, total: xs.length };
  }
  if (tab === 'activity') {
    let xs = activityRows(range).filter((r) => typesOf(p.type).includes(r.tkey));
    if (p.series) xs = xs.filter((r) => r.event.toLowerCase() === p.series);
    if (p.date) xs = xs.filter((r) => r.label === p.date);
    return { rows: xs.slice(0, 48), total: activityTotal(p, range) };
  }
  if (tab === 'runs') {
    let xs = runsFor(range);
    if (p.status) xs = xs.filter((r) => r.status === p.status);
    return { rows: xs, total: xs.length };
  }
  let xs = groupsFor(p.domain && p.domain !== '' ? p.domain : 'LPDE4.local');
  if (p.gtype) xs = xs.filter((g) => g.type.toLowerCase() === p.gtype);
  if (p.stage) xs = xs.filter((g) => g.stage === p.stage);
  return { rows: xs, total: xs.length };
}
