import { useEffect, useState } from 'react';
import { Button, EmptyState, IconButton, Modal, TextField, useToast } from '../../../ui';
import { adminActions, adminStore, type AllowlistEntry } from '../../../stores/admin';
import { uid } from '../../../stores/createStore';
import { CIDR_RE, HOSTNAME_RE, IPV4_RE } from './kit';

/* DLG-SAD-01 · API White Listing — edits a copy of the saved list; nothing persists until Save. */

const isAddress = (v: string) => IPV4_RE.test(v) || CIDR_RE.test(v) || (!/^[\d./]+$/.test(v) && HOSTNAME_RE.test(v));

export function AllowlistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [list, setList] = useState<AllowlistEntry[]>([]);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reopening resets the draft to the saved list.
  useEffect(() => {
    if (open) { setList(adminStore.get().allowlist); setValue(''); setNote(''); setError(null); }
  }, [open]);

  const add = () => {
    const v = value.trim();
    if (!v) return setError('Enter an IP address, CIDR range or host name.');
    if (!isAddress(v)) return setError('Use an IPv4 address (10.0.0.5), a range (10.0.0.0/24) or a host name (api.example.com).');
    if (list.some((x) => x.value.toLowerCase() === v.toLowerCase())) return setError('This entry is already in the list.');
    setList((l) => [...l, { id: uid('ip'), value: v, description: note.trim() }]);
    setValue(''); setNote(''); setError(null);
  };

  const save = () => {
    adminActions.setAllowlist(list);
    toast({ variant: 'success', title: 'API white listing saved',
      message: list.length ? `${list.length} address(es) can call the Lepide API.` : 'The white list is empty.' });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="API White Listing" icon="shield" size="sm"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <p className="muted" style={{ margin: 0 }}>Only the addresses listed here can call the Lepide API.</p>
      <form className="allow-form" noValidate onSubmit={(e) => { e.preventDefault(); add(); }}>
        <TextField value={value} placeholder="IP address, range or host name" aria-label="IP address, range or host name" maxLength={253}
          error={error} onChange={(v) => { setValue(v); setError(null); }} />
        <TextField value={note} placeholder="Description (optional)" aria-label="Description" maxLength={120} onChange={setNote} />
        <Button type="submit" icon="plus">Add</Button>
      </form>
      {list.length === 0 ? (
        <EmptyState compact icon="shield" title="No addresses yet. Add an IP address, range or host name." />
      ) : (
        <ul className="allow-list" aria-label="Allowed addresses">
          {list.map((x) => (
            <li key={x.id} className="colrow">
              <span className="colrow__name"><b>{x.value}</b><span>{x.description || '—'}</span></span>
              <IconButton icon="trash" label={`Remove ${x.value}`} data-tip="Remove" danger
                onClick={() => setList((l) => l.filter((y) => y.id !== x.id))} />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
