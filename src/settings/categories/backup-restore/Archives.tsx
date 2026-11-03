import { useState } from 'react';
import { Button, ConfirmDialog, DataTable, EmptyState, IconButton, ToneTag, toneFor, useToast } from '../../../ui';
import type { Column } from '../../../ui';
import { deleteArchive, setArchiveStatus, subStore } from '../../../stores/subscription';
import type { ArchiveJob } from '../../../stores/subscription';
import { ArchiveDialog, RestoreDataDialog, RestoredDatabasesDialog } from './archiveDialogs';

/* SCR-SAD-08 Archives & Imports (INT-SAD-175 … 183) + DLG-SAD-20 Delete archive.
   GAP-SAD-13 intended: "Component Name" shows the component; the server has its own column. */

type Open = null | { kind: 'new' } | { kind: 'edit' | 'restore' | 'delete'; row: ArchiveJob } | { kind: 'restored' };

export default function Archives() {
  const toast = useToast();
  const rows = subStore.use((s) => s.archives);
  const [open, setOpen] = useState<Open>(null);

  const archiveNow = (a: ArchiveJob) => {
    setArchiveStatus(a.id, 'Running');
    toast({ variant: 'success', title: 'Archiving started', message: `${a.componentType} data older than ${a.olderThanDays || 0} days is being archived to ${a.path}.` });
  };

  const columns: Column<ArchiveJob>[] = [
    { key: 'componentType', header: 'Component Type', sortable: true, filterable: true, minWidth: 150 },
    { key: 'componentName', header: 'Component Name', sortable: true, filterable: true, minWidth: 200 },
    { key: 'server', header: 'Server', sortable: true, filterable: true, minWidth: 130 },
    { key: 'schedule', header: 'Schedule Details', sortable: true, filterable: true, minWidth: 240, value: (a) => a.schedule || 'Archive now only' },
    { key: 'restore', header: 'Restore', width: 128, render: (a) => <Button size="sm" icon="restore" onClick={() => setOpen({ kind: 'restore', row: a })}>Restore now</Button> },
    { key: 'archive', header: 'Archive', width: 128, render: (a) => <Button size="sm" icon="archive" onClick={() => archiveNow(a)}>Archive now</Button> },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: 120, render: (a) => <ToneTag tone={toneFor(a.status)}>{a.status}</ToneTag> },
    {
      key: 'actions', header: 'Action', width: 130,
      render: (a) => (
        <span className="row">
          <IconButton icon="trash" danger label={`Delete ${a.componentType} archive`} data-tip="Delete" onClick={() => setOpen({ kind: 'delete', row: a })} />
          <IconButton icon="edit" label={`Edit ${a.componentType} archive`} data-tip="Edit" onClick={() => setOpen({ kind: 'edit', row: a })} />
          <IconButton icon="database" label="Delete restored databases" data-tip="Restored databases" onClick={() => setOpen({ kind: 'restored' })} />
        </span>
      ),
    },
  ];

  const pending = open?.kind === 'delete' ? open.row : null;

  return (
    <>
      <DataTable className="backup-restore-archives" title="Archives & Imports" noun={['archive', 'archives']} columns={columns} rows={rows} rowKey={(a) => a.id}
        toolbar={<Button variant="primary" icon="plus" onClick={() => setOpen({ kind: 'new' })}>Archive database</Button>}
        empty={<EmptyState compact icon="archive" title="No archives yet. Click Archive Database to create one." />} />

      {open?.kind === 'new' && <ArchiveDialog onClose={() => setOpen(null)} />}
      {open?.kind === 'edit' && <ArchiveDialog initial={open.row} onClose={() => setOpen(null)} />}
      {open?.kind === 'restore' && <RestoreDataDialog row={open.row} onClose={() => setOpen(null)} />}
      {open?.kind === 'restored' && <RestoredDatabasesDialog onClose={() => setOpen(null)} />}
      <ConfirmDialog open={!!pending} onClose={() => setOpen(null)} title="Delete archive" confirmLabel="Delete"
        message={pending ? `Delete the ${pending.componentType} archive on ${pending.server}? Its schedule stops; archived files stay on disk.` : undefined}
        onConfirm={() => {
          if (!pending) return;
          deleteArchive(pending.id);
          toast({ variant: 'success', title: 'Archive deleted', message: `${pending.componentType} archive removed.` });
          setOpen(null);
        }} />
    </>
  );
}
