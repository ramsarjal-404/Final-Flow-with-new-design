import { useEffect, useState } from 'react';
import { Button, FileUpload, Icon, IconButton, Modal, SelectField, TextField, useToast } from '../../../ui';
import { AUDITED_SERVERS, DATASETS, downloadText, isUnc, uncHost } from './store';
import type { IdfSource, ObjectRow } from './store';
import { CheckTable, TreeGroup, TreeLeaf } from './shared';

export type NewObject = Omit<ObjectRow, 'id'>;

/* ---------- DLG-SDS-55 · Single-value object dialogs ---------- */
export type SingleKind = 'server' | 'unc' | 'site' | 'folder';
const SINGLE: Record<SingleKind, {
  title: string; label: (s: IdfSource) => string; note: string; placeholder: string; check: (v: string) => string | NewObject;
}> = {
  server: {
    title: String.raw`Please Enter Server Name\IP`, label: (s) => s.label, note: String.raw`Note: use\\Server Name Format`, placeholder: String.raw`\\192.14.35.335`,
    check: (v) => {
      if (!v) return 'Enter the server name or IP.';
      const m = /^\\\\([^\\\s]+)$/.exec(v);
      if (!m) return String.raw`Use the \\Server Name format, e.g. \\192.14.35.335.`;
      return { path: v + String.raw`\$all`, server: m[1] };
    },
  },
  unc: {
    title: 'Please enter UNC path', label: () => 'UNC Path :', note: String.raw`Use "\\Server name\Share name" format`, placeholder: String.raw`\\server\share`,
    check: (v) => {
      if (!v) return 'Enter the UNC path.';
      if (!isUnc(v)) return String.raw`Use the \\Server name\Share name format.`;
      return { path: v, server: uncHost(v) };
    },
  },
  site: {
    title: 'Please enter site collection URL', label: () => 'Site Collection:', note: 'Please enter Site collection URL', placeholder: 'http://SP-2019/sites/finance',
    check: (v) => {
      if (!v) return 'Enter the site collection URL.';
      if (!/^https?:\/\/\S+$/i.test(v)) return 'Enter a full URL starting with http:// or https://.';
      return { path: v, server: '' };
    },
  },
  folder: {
    title: 'Please enter folder path', label: () => 'Folder Path:', note: 'Please enter the Dropbox folder path, e.g. /Finance', placeholder: '/Finance',
    check: (v) => {
      if (!v) return 'Enter the folder path.';
      if (!v.startsWith('/')) return 'Folder paths start with "/".';
      return { path: v, server: '' };
    },
  },
};

export function SingleValueDialog({ kind, source, onClose, onAdd }: { kind: SingleKind | null; source: IdfSource; onClose: () => void; onAdd: (o: NewObject[]) => void }) {
  const toast = useToast();
  const [v, setV] = useState('');
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setV(''); setErr(null); }, [kind]);
  if (!kind) return null;
  const cfg = SINGLE[kind];
  const done = () => {
    const r = cfg.check(v.trim());
    if (typeof r === 'string') { setErr(r); toast({ variant: 'error', title: 'Check the highlighted field', message: r }); return; }
    onAdd([r]);
  };
  return (
    <Modal open onClose={onClose} title={cfg.title} icon="plus" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <TextField label={cfg.label(source)} help={cfg.note} placeholder={cfg.placeholder} value={v} error={err} autoFocus
        onChange={(x) => { setV(x); setErr(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } }} />
      {err && <p className="help">{cfg.note}</p>}
    </Modal>
  );
}

/* ---------- DLG-SDS-56 · Import From Existing Data Sets ---------- */
export function ImportDatasetDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (o: NewObject[]) => void }) {
  const toast = useToast();
  const [set, setSet] = useState('');
  const [checked, setChecked] = useState<string[]>([]);
  useEffect(() => { if (open) { setSet(''); setChecked([]); } }, [open]);
  const rows = set ? DATASETS[set] ?? [] : [];
  const done = () => {
    const picked = rows.filter((r) => checked.includes(r.path));
    if (picked.length === 0) { toast({ variant: 'error', title: 'Nothing selected', message: 'Pick a data set and check at least one path.' }); return; }
    onAdd(picked.map((r) => ({ path: r.path, server: r.server })));
  };
  return (
    <Modal open={open} onClose={onClose} title="Import from existing data sets" icon="layers" size="md"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <SelectField label="Data Set" placeholder="Select" options={Object.keys(DATASETS)} value={set} onChange={(v) => { setSet(v); setChecked([]); }} />
      <CheckTable label="Data set paths" rows={rows} rowKey={(r) => r.path} checked={checked} onChecked={setChecked} rowToggle
        cols={[{ key: 'path', header: 'Path', cell: (r) => r.path }, { key: 'server', header: 'File Server', cell: (r) => r.server }]}
        empty="Select a data set to list its paths." />
    </Modal>
  );
}

/* ---------- DLG-SDS-57 · Import From Csv ---------- */
export function ImportCsvDialog({ open, onClose, onAdd, urlMode }: { open: boolean; onClose: () => void; onAdd: (o: NewObject[]) => void; urlMode: boolean }) {
  const toast = useToast();
  const [file, setFile] = useState<{ name: string; rows: string[] } | null>(null);
  useEffect(() => { if (open) setFile(null); }, [open]);
  const word = urlMode ? 'url' : 'path';
  const read = (f: File) => {
    if (!/\.csv$/i.test(f.name)) { toast({ variant: 'error', title: 'Unsupported file', message: 'Choose a .csv file.' }); return; }
    f.text().then((text) => {
      const rows = text.split(/\r?\n/).map((l) => (l.split(',')[0] ?? '').trim().replace(/^"(.*)"$/, '$1').trim())
        .filter((c, i) => c && !(i === 0 && /^(path|url)$/i.test(c)));
      setFile({ name: f.name, rows });
    });
  };
  const done = () => {
    if (!file) { toast({ variant: 'error', title: 'No file chosen', message: 'Choose a CSV file to upload.' }); return; }
    if (file.rows.length === 0) { toast({ variant: 'error', title: 'Empty file', message: `${file.name} has no ${word} rows.` }); return; }
    onAdd(file.rows.map((p) => ({ path: p, server: uncHost(p) })));
  };
  const template = () => downloadText('identify-import-format.csv', urlMode
    ? 'URL\nhttp://SP-2019/sites/finance\nhttp://SP-2019/sites/hr\n'
    : 'Path\n\\\\192.168.30.93\\Finance\n\\\\192.168.30.94\\Accounts\n');
  return (
    <Modal open={open} onClose={onClose} title="Import from CSV" icon="upload" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      {file ? (
        <div className="basecard">
          <span className="basecard__ic"><Icon name="file" /></span>
          <div className="basecard__text"><b>{file.name} — {file.rows.length} row(s) found</b></div>
          <Button size="sm" onClick={() => setFile(null)}>Choose another file</Button>
        </div>
      ) : (
        <FileUpload accept=".csv" label="Please Choose file to upload Csv" onFile={read} />
      )}
      <div><button type="button" className="lf-link identify-linkbtn" onClick={template}><Icon name="download" size={14} /> Download CSV Format (CSV)</button></div>
    </Modal>
  );
}

/* ---------- DLG-SDS-58 · Select Folders (Identify) ---------- */
export function SelectFoldersDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (o: NewObject[]) => void }) {
  const toast = useToast();
  const servers = Object.keys(AUDITED_SERVERS);
  const [server, setServer] = useState(servers[0]);
  const [expanded, setExpanded] = useState(true);
  const [more, setMore] = useState(false);
  const [hi, setHi] = useState('');
  const [picked, setPicked] = useState<{ folder: string; server: string }[]>([]);
  useEffect(() => { if (open) { setServer(servers[0]); setExpanded(true); setMore(false); setHi(''); setPicked([]); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const folders = AUDITED_SERVERS[server] ?? [];
  const shown = more ? folders : folders.slice(0, 6);
  const move = () => {
    if (!hi) { toast({ variant: 'error', title: 'No folder selected', message: 'Click a folder in the tree, then use the arrow.' }); return; }
    if (picked.some((p) => p.folder === hi && p.server === server)) { toast({ variant: 'info', title: 'Already added', message: `${hi} is already in the list.` }); return; }
    setPicked((p) => [...p, { folder: hi, server }]);
  };
  const done = () => {
    if (picked.length === 0) { toast({ variant: 'error', title: 'No folders added', message: 'Move at least one folder to the list on the right.' }); return; }
    onAdd(picked.map((p) => ({ path: `\\\\${p.server}\\${p.folder}`, server: p.server })));
  };
  return (
    <Modal open={open} onClose={onClose} title="Select folders" icon="folder" size="lg"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <SelectField label="File Server :" options={servers} value={server} onChange={(v) => { setServer(v); setHi(''); setMore(false); }} />
      <div className="identify-shuttle">
        <div className="identify-treebox">
          <ul className="tree" role="tree" aria-label="Folders">
            <TreeGroup label={server} icon="server" open={expanded} onToggle={() => setExpanded((e) => !e)}>
              {shown.map((f) => <TreeLeaf key={f} label={f} selected={hi === f} onSelect={() => setHi(f)} />)}
              {folders.length > 6 && (
                <li><button type="button" className="identify-more" onClick={() => setMore((m) => !m)}>{more ? 'View Less' : 'View More'}</button></li>
              )}
            </TreeGroup>
          </ul>
        </div>
        <div className="identify-shuttle__mid">
          <IconButton icon="chevron-right" label="Add selected folder" bordered onClick={move} />
        </div>
        <CheckTable label="Selected folders" rows={picked} rowKey={(r) => r.server + '|' + r.folder} maxHeight={300}
          cols={[
            { key: 'f', header: 'Folder Name', cell: (r) => r.folder },
            { key: 's', header: 'Server Name', cell: (r) => r.server },
            { key: 'a', header: 'Action', cell: (r) => <IconButton icon="trash" label={`Remove ${r.folder}`} className="identify-danger-ic"
              onClick={() => setPicked((p) => p.filter((x) => x !== r))} /> },
          ]}
          empty="No folders selected." />
      </div>
    </Modal>
  );
}
