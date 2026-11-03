import { useMemo, useState } from 'react';
import {
  Button, Card, ConfirmDialog, DataTable, EmptyState, IconButton, Menu, PageHeader, SearchField, ToneTag, Tree, useToast,
  type Column, type IconName, type TreeItem,
} from '@lepide/ds-react';

/* Reports hub (DESIGN.md §4.2): a 288 px folder Tree card beside the report table. The current folder uses the
   selected finish; the Favourites group expands to a nested list behind a hairline. Rows open the report; the
   row menu has Open, Add to My Lepide and a destructive Delete that asks first. */

type Folder = 'ad' | 'files' | 'exchange' | 'sql' | 'm365';
type Report = { id: string; name: string; folder: Folder; source: string; lastRun: string; schedule: string };

const FOLDERS: { id: Folder | 'all'; label: string; icon: IconName }[] = [
  { id: 'all', label: 'All reports', icon: 'layers' },
  { id: 'ad', label: 'Active Directory', icon: 'users' },
  { id: 'files', label: 'File server', icon: 'server' },
  { id: 'exchange', label: 'Exchange Online', icon: 'mail' },
  { id: 'sql', label: 'SQL Server', icon: 'database' },
  { id: 'm365', label: 'SharePoint and OneDrive', icon: 'cloud' },
];

const REPORTS: Report[] = [
  { id: 'r1', name: 'All modifications in Active Directory', folder: 'ad', source: 'corp.lepide.local', lastRun: '2026-11-03 08:00', schedule: 'Daily' },
  { id: 'r2', name: 'User account lockouts', folder: 'ad', source: 'corp.lepide.local', lastRun: '2026-11-03 07:45', schedule: 'Hourly' },
  { id: 'r3', name: 'Group membership changes', folder: 'ad', source: 'corp.lepide.local', lastRun: '2026-11-02 18:00', schedule: 'Daily' },
  { id: 'r4', name: 'Failed logons by user', folder: 'ad', source: 'eu.lepide.local', lastRun: '2026-11-03 06:30', schedule: 'Daily' },
  { id: 'r5', name: 'Permission changes', folder: 'files', source: 'FS01.corp.lepide.local', lastRun: '2026-11-03 08:15', schedule: 'Daily' },
  { id: 'r6', name: 'Files deleted', folder: 'files', source: 'FS01.corp.lepide.local', lastRun: '2026-11-03 08:15', schedule: 'Hourly' },
  { id: 'r7', name: 'Files shared with Everyone', folder: 'files', source: 'FS02.corp.lepide.local', lastRun: '2026-11-01 22:00', schedule: 'Weekly' },
  { id: 'r8', name: 'Mass file renames', folder: 'files', source: 'FS02.corp.lepide.local', lastRun: '2026-10-30 12:10', schedule: '' },
  { id: 'r9', name: 'Mailbox permission changes', folder: 'exchange', source: 'lepide.onmicrosoft.com', lastRun: '2026-11-03 05:00', schedule: 'Daily' },
  { id: 'r10', name: 'Non-owner mailbox access', folder: 'exchange', source: 'lepide.onmicrosoft.com', lastRun: '2026-11-02 05:00', schedule: 'Daily' },
  { id: 'r11', name: 'Database schema changes', folder: 'sql', source: 'SQL01\\FINANCE', lastRun: '2026-11-03 07:00', schedule: 'Daily' },
  { id: 'r12', name: 'Failed SQL logons', folder: 'sql', source: 'SQL01\\FINANCE', lastRun: '2026-10-28 09:20', schedule: '' },
  { id: 'r13', name: 'External sharing in SharePoint', folder: 'm365', source: 'lepide.sharepoint.com', lastRun: '2026-11-03 04:00', schedule: 'Daily' },
  { id: 'r14', name: 'OneDrive files downloaded', folder: 'm365', source: 'lepide.sharepoint.com', lastRun: '2026-11-02 04:00', schedule: 'Weekly' },
];

const FAVOURITES = ['r2', 'r5', 'r9'];

const columns: Column<Report>[] = [
  { key: 'name', header: 'Report', sortable: true, minWidth: 200 },
  { key: 'source', header: 'Data source', sortable: true, mono: true, minWidth: 170 },
  { key: 'lastRun', header: 'Last run', sortable: true, width: 150 },
  { key: 'schedule', header: 'Schedule', sortable: true, width: 156, value: (r) => r.schedule,
    render: (r) => (r.schedule ? <ToneTag tone="info">{r.schedule}</ToneTag> : <ToneTag tone="none">Not scheduled</ToneTag>) },
];

export default function ReportHub() {
  const toast = useToast();
  const [reports, setReports] = useState(REPORTS);
  const [folder, setFolder] = useState<Folder | 'all'>('files');
  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<Report | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reports.length };
    for (const r of reports) c[r.folder] = (c[r.folder] ?? 0) + 1;
    return c;
  }, [reports]);
  const rows = folder === 'all' ? reports : reports.filter((r) => r.folder === folder);
  const current = FOLDERS.find((f) => f.id === folder)!;
  const favourites = reports.filter((r) => FAVOURITES.includes(r.id));
  const tree: TreeItem[] = [
    ...FOLDERS.map((f) => ({ id: f.id, label: f.label, icon: f.icon, count: counts[f.id] ?? 0 })),
    { id: 'fav', label: 'Favourites', count: favourites.length, children: favourites.map((r) => ({ id: r.id, label: r.name })) },
  ];

  const open = (r: Report) => toast({ variant: 'info', message: `Opening "${r.name}"` });
  const pin = (r: Report) => toast({ variant: 'success', title: 'Added to My Lepide', message: r.name });
  const remove = () => {
    if (!toDelete) return;
    setReports((list) => list.filter((r) => r.id !== toDelete.id));
    toast({ variant: 'success', message: `"${toDelete.name}" deleted` });
    setToDelete(null);
  };

  return (
    <div className="sub">
      <PageHeader
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Auditor', to: '/auditor' }, { label: 'Reports' }]}
        title="Reports"
        description="Saved and scheduled audit reports, grouped by the system they read from."
        actions={<>
          <Button icon="download" onClick={() => toast({ variant: 'success', message: `${rows.length} reports exported as CSV` })}>Export list</Button>
          <Button variant="primary" icon="plus" onClick={() => toast({ variant: 'info', message: 'Opening the report builder' })}>Create report</Button>
        </>}
      />

      <div className="reports">
        <Card className="folders" title="Folders">
          <Tree ariaLabel="Report folders" value={folder} defaultExpanded={['fav']} items={tree}
            onSelect={(it) => {
              const f = FOLDERS.find((x) => x.id === it.id);
              if (f) { setFolder(f.id); return; }
              const r = favourites.find((x) => x.id === it.id);
              if (r) open(r);
            }} />
        </Card>

        <DataTable
          title={current.label} noun={['report', 'reports']} rows={rows} rowKey={(r) => r.id} columns={columns}
          search={q} initialSort={{ key: 'lastRun', dir: 'desc' }}
          toolbar={<SearchField value={q} onChange={setQ} placeholder="Search reports" ariaLabel="Search reports" />}
          onRowOpen={open}
          rowActions={(r) => (
            <Menu
              label={`Actions for ${r.name}`}
              trigger={(p) => <IconButton {...p} icon="more" label="More actions" />}
              items={[
                { label: 'Open', icon: 'external', onSelect: () => open(r) },
                { label: 'Add to My Lepide', icon: 'star', onSelect: () => pin(r) },
                { separator: true, label: '' },
                { label: 'Delete', icon: 'trash', danger: true, onSelect: () => setToDelete(r) },
              ]}
            />
          )}
          empty={<EmptyState icon="file-search" title="No reports in this folder" message="Create a report or move one here from another folder." />}
        />
      </div>

      <ConfirmDialog
        open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove}
        title="Delete this report?"
        message={toDelete ? `"${toDelete.name}" and its schedule are removed for everyone. This can't be undone.` : undefined}
        confirmLabel="Delete report"
      />
    </div>
  );
}
