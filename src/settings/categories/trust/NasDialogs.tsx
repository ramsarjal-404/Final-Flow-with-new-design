import { useState } from 'react';
import { Button, Checkbox, FileUpload, IconButton, Menu, Modal, SelectField, TextField, useToast } from '../../../ui';
import { CheckTable, TreeGroup, TreeLeaf } from './shared';
import { AdDomainDialog, IpRangeDialog, OuDialog } from './DbDialogs';
import { APPLY_TO, AUDITED_SERVERS, FOLDER_TREE, NAS_SERVERS, NAS_SHARES, plural, splitCsvLine } from './store';

export type NewFolder = { folder: string; server: string; applyTo: string };

/* ================= DLG-SDS-39 · Select File Server(s) ================= */
export function SelectFileServersDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (rows: NewFolder[]) => void }) {
  const toast = useToast();
  const [sensitive, setSensitive] = useState(false);
  const [files, setFiles] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const done = () => {
    if (!checked.length) { toast({ variant: 'error', title: 'Select File Server(s)', message: 'Please select at least one file server.' }); return; }
    const rows: NewFolder[] = [];
    NAS_SERVERS.filter((s) => checked.includes(s)).forEach((s) => {
      const shares = NAS_SHARES[s];
      if (shares?.length) shares.forEach((f) => rows.push({ folder: f, server: s, applyTo: APPLY_TO[0] }));
      else rows.push({ folder: 'All Shares', server: s, applyTo: APPLY_TO[0] });
    });
    onDone(rows); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Select File Server(s)" icon="server" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <div className="row row--wrap" style={{ gap: 16 }}>
        <Checkbox checked={sensitive} onChange={setSensitive} label="Include sensitive data information" />
        <Checkbox checked={files} onChange={setFiles} label="Include files" />
      </div>
      <CheckTable label="File Server" rows={NAS_SERVERS} rowKey={(r) => r} checked={checked} onChecked={setChecked} empty="No file servers."
        cols={[{ key: 'fs', header: 'File Server', cell: (r) => r }]} />
    </Modal>
  );
}

/* ================= DLG-SDS-40 · Import from CSV ================= */
export function ImportCsvDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (rows: NewFolder[]) => void }) {
  const toast = useToast();
  const [file, setFile] = useState<{ name: string; size: number; text: string } | null>(null);
  const pick = (f: File) => {
    if (!/\.csv$/i.test(f.name)) { toast({ variant: 'error', title: 'Import from CSV', message: 'Please choose a .csv file.' }); return; }
    f.text().then((text) => setFile({ name: f.name, size: f.size, text }));
  };
  const done = () => {
    if (!file) { toast({ variant: 'error', title: 'Import from CSV', message: 'Please choose a CSV file to upload.' }); return; }
    // GAP-SDS-08 intended behaviour: parse "Folder Name,Server Name[,Apply To]" (header optional).
    const rows: NewFolder[] = [];
    file.text.split(/\r?\n/).forEach((line) => {
      if (!line.trim()) return;
      const [folder = '', server = '', apply = ''] = splitCsvLine(line);
      if (!folder || !server || /^folder name$/i.test(folder)) return;
      const applyTo = APPLY_TO.find((a) => a.toLowerCase() === apply.toLowerCase()) ?? APPLY_TO[0];
      rows.push({ folder, server, applyTo });
    });
    if (!rows.length) { toast({ variant: 'error', title: 'Import from CSV', message: `${file.name} has no folder rows. Use the columns Folder Name, Server Name, Apply To.` }); return; }
    onDone(rows); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Import from CSV" icon="upload" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <FileUpload accept=".csv" label="Drag & Drop or Choose file to upload" rules="Columns: Folder Name, Server Name, Apply To (optional)"
        file={file} onFile={pick} onClear={() => setFile(null)} />
    </Modal>
  );
}

/* ================= DLG-SDS-41 · Select Folders ================= */
export function SelectFoldersDialog({ open, onClose, onDone, addFileServer }: {
  open: boolean; onClose: () => void; onDone: (rows: NewFolder[]) => void; addFileServer?: boolean;
}) {
  const toast = useToast();
  const [servers, setServers] = useState<string[]>(AUDITED_SERVERS);
  const [server, setServer] = useState('');
  const [cluster, setCluster] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [files, setFiles] = useState(false);
  const [rootOpen, setRootOpen] = useState(true);
  const [ticked, setTicked] = useState<string[]>([]);
  const [chosen, setChosen] = useState<NewFolder[]>([]);
  const [sub, setSub] = useState<'' | 'ad' | 'ou' | 'ip'>('');
  const added = (names: string[]) => {
    const fresh = names.filter((n) => !servers.includes(n));
    setServers([...servers, ...fresh]);
    if (names[0]) { setServer(names[0]); setTicked([]); }
    toast({ variant: 'success', title: 'File servers added', message: `${plural(names.length, 'file server')} added to the list.` });
  };
  const move = () => {
    const next = [...chosen];
    ticked.forEach((f) => { if (!next.some((c) => c.folder === f && c.server === server)) next.push({ folder: f, server, applyTo: APPLY_TO[0] }); });
    setChosen(next); setTicked([]);
  };
  const allOn = ticked.length === FOLDER_TREE.length;
  return (
    <>
      <Modal open={open} onClose={onClose} title="Select folders" subtitle="Please select the shared folder(s) to be scanned for permission." icon="folder" size="lg"
        escapeCloses={!sub}
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!chosen.length} onClick={() => { onDone(chosen); onClose(); }}>Done</Button></>}>
        <div className="trust-inline">
          <SelectField className="grow" label="File Server" placeholder="Select" options={servers} value={server} onChange={(v) => { setServer(v); setTicked([]); }} />
          {addFileServer && (
            <Menu align="right" label="Add file server" items={[
              { label: 'From AD', icon: 'building', onSelect: () => setSub('ad') },
              { label: 'From Containers/OUs', icon: 'folder', onSelect: () => setSub('ou') },
              { label: 'From IP range', icon: 'globe', onSelect: () => setSub('ip') },
            ]} trigger={(p) => <Button icon="plus" iconEnd="chevron" {...p}>Add file server</Button>} />
          )}
        </div>
        <div className="row row--wrap" style={{ gap: 16 }}>
          <Checkbox checked={cluster} onChange={setCluster} label="Cluster device only" />
          <Checkbox checked={sensitive} onChange={setSensitive} label="Include sensitive data information" />
          <Checkbox checked={files} onChange={setFiles} label="Include files" />
        </div>
        <div className="trust-shuttle">
          <div className="stack stack--sm">
            <Checkbox checked={!!server && allOn} indeterminate={!!server && ticked.length > 0 && !allOn} disabled={!server} label="Select all"
              onChange={() => setTicked(allOn ? [] : [...FOLDER_TREE])} />
            <div className="trust-treebox">
              {server ? (
                <ul className="tree" role="tree" aria-label="Folders">
                  <TreeGroup label={server} open={rootOpen} onToggle={() => setRootOpen(!rootOpen)}>
                    {FOLDER_TREE.map((f) => <TreeLeaf key={f} label={f} check={{ checked: ticked.includes(f), onChange: () => setTicked(ticked.includes(f) ? ticked.filter((x) => x !== f) : [...ticked, f]) }} />)}
                  </TreeGroup>
                </ul>
              ) : <p className="muted text-sm" style={{ margin: 8 }}>Select a file server to list its folders.</p>}
            </div>
          </div>
          <div className="trust-shuttle__mid">
            <IconButton icon="chevron-right" label="Add selected folders" bordered disabled={!ticked.length} onClick={move} />
          </div>
          <CheckTable label="Selected folders" rows={chosen} rowKey={(r) => r.server + '|' + r.folder} empty="No folders selected yet."
            cols={[{ key: 'f', header: 'Folder Name', cell: (r) => r.folder }, { key: 's', header: 'Server Name', cell: (r) => r.server },
              { key: 'a', header: 'Action', cell: (r) => <IconButton icon="trash" danger label={`Remove ${r.folder}`} onClick={() => setChosen(chosen.filter((c) => c !== r))} /> }]} />
        </div>
      </Modal>
      {sub === 'ad' && <AdDomainDialog open title="Select folders" onClose={() => setSub('')} onDone={added} />}
      {sub === 'ou' && <OuDialog open onClose={() => setSub('')} onDone={added} />}
      {sub === 'ip' && <IpRangeDialog open onClose={() => setSub('')} onDone={added} />}
    </>
  );
}

/* ================= DLG-SDS-42 · Please Enter Site Collection URL ================= */
export function SiteUrlDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (url: string) => void }) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [bad, setBad] = useState(false);
  const msg = 'Please enter site collection URL (Use format http://...)';
  const done = () => {
    if (!/^https?:\/\/\S+$/i.test(url.trim())) { setBad(true); toast({ variant: 'error', title: 'Site collection URL', message: msg }); return; }
    onDone(url.trim()); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Please enter site collection URL" icon="link" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); done(); }} style={{ display: 'contents' }}>
        <TextField label="URL" help={msg} value={url} error={bad ? msg : null} onChange={(v) => { setUrl(v); setBad(false); }} />
      </form>
    </Modal>
  );
}

