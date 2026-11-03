import { useState } from 'react';
import { Button, Checkbox, Icon, IconButton, Modal, PasswordField, TextField, useToast } from '../../../ui';
import { FILE_SERVERS, addAgents, protectStore } from './store';

/* DLG-SDS-71 Lepide Protect Agent Configuration (add): "List of File Server" → drag (or check and
   click the drop target) → "Selected File Server"; credentials enabled once a server is selected. */
export function AddAgentDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const agents = protectStore.use((s) => s.agents);
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [user, setUser] = useState('');
  const [pw, setPw] = useState('');
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<{ pick?: string; cred?: string }>({});

  const enrolled = new Set(agents.map((a) => a.fileServer));
  const available = FILE_SERVERS.filter((fs) => !enrolled.has(fs) && !selected.includes(fs));
  const allOn = available.length > 0 && available.every((fs) => checked.includes(fs));
  const someOn = checked.some((fs) => available.includes(fs));

  const add = (extra?: string) => {
    const list = Array.from(new Set([...checked, ...(extra ? [extra] : [])])).filter((fs) => available.includes(fs));
    if (!list.length) return;
    setSelected((s) => [...s, ...list.filter((fs) => !s.includes(fs))]);
    setChecked([]); setErr((e) => ({ ...e, pick: undefined }));
  };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setOver(false); add(e.dataTransfer.getData('text/plain') || undefined); };
  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop,
  };

  const done = () => {
    if (!selected.length) { setErr({ pick: 'Select at least one file server.' }); return; }
    if (!user.trim() || !pw) { setErr({ cred: 'Enter the user name and password used to install the agent.' }); return; }
    addAgents(selected, user.trim());
    toast({ variant: 'info', title: `${selected.length} agent(s) queued`, message: 'Installation runs in the background; the status column updates as it progresses.' });
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" icon="server" title="Lepide Protect Agent Configuration"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <div className="protect-shuttle">
        <div className="protect-list">
          <div className="protect-list__head">
            <Checkbox checked={allOn} indeterminate={someOn && !allOn} disabled={!available.length} ariaLabel="Select all file servers"
              onChange={() => setChecked(allOn ? [] : [...available])} />
            <span className="grow">List of File Server</span>
          </div>
          <div className="protect-list__body">
            {available.length ? available.map((fs) => (
              <div key={fs} className="protect-list__row" draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', fs); e.dataTransfer.effectAllowed = 'move'; }}>
                <Checkbox label={fs} checked={checked.includes(fs)}
                  onChange={(on) => setChecked((c) => (on ? [...c, fs] : c.filter((x) => x !== fs)))} />
              </div>
            )) : <p className="protect-list__empty">Every file server is already enrolled or selected.</p>}
          </div>
        </div>

        {selected.length === 0 ? (
          <button type="button" className={'protect-drop' + (over ? ' is-over' : '')} {...dropProps} onClick={() => add()}
            aria-label="Drag and drop the file server (adds the checked file servers)">
            <Icon name="download" size={22} />
            <span>Drag and drop the file server</span>
          </button>
        ) : (
          <div className={'protect-list' + (over ? ' is-over' : '')} {...dropProps}>
            <div className="protect-list__head">
              <Checkbox checked ariaLabel="Clear all selected file servers" onChange={() => setSelected([])} />
              <span className="grow">Selected File Server</span>
              <IconButton icon="trash" danger label="Clear selected servers" onClick={() => setSelected([])} />
            </div>
            <div className="protect-list__body">
              {selected.map((fs) => (
                <div key={fs} className="protect-list__row" style={{ cursor: 'default' }}>
                  <Checkbox label={fs} checked onChange={() => setSelected((s) => s.filter((x) => x !== fs))} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {err.pick && <p className="protect-err" role="alert">{err.pick}</p>}
      <div className="fld-row">
        <TextField label={<span className="row" style={{ gap: 6 }}>User Name
          <span tabIndex={0} role="img" data-tip="Account with local administrator rights on the selected file servers."
            aria-label="Account with local administrator rights on the selected file servers." style={{ display: 'inline-flex', color: 'var(--ink-3)' }}><Icon name="info" size={14} /></span></span>}
          placeholder="chily/richard" value={user} disabled={!selected.length} maxLength={255}
          onChange={(v) => { setUser(v); setErr({}); }} />
        <PasswordField label="Password" value={pw} disabled={!selected.length} error={err.cred} autoComplete="new-password"
          onChange={(v) => { setPw(v); setErr({}); }} />
      </div>
    </Modal>
  );
}
