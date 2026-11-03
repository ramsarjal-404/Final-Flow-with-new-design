import { useEffect, useMemo, useState } from 'react';
import { Button, ConfirmDialog, EmptyState, IconButton, Modal, PasswordField, TextField, useToast } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import notify from '../../../data/settings/notify.json';
import { adminActions, adminStore, type IqCredential } from '../../../stores/admin';
import { AdminTable, useTable, type Col } from '../general/kit';

/* SCR-SAD-03 · Lepide IQ with DLG-SAD-05 (Add / Edit Credentials) and DLG-SAD-06 (Delete).
   Credentials are kept in the admin store for the session (GAP-SAD-02 intended, AC-SAD-043). */

const SAMPLE = notify.exports.IQ_SAMPLE as { name: string; endpoint: string; model: string };
const HTTPS_RE = /^https:\/\/[^\s/?#.]+(?:\.[^\s/?#.]+)*\.[a-z]{2,63}(?::\d+)?(?:[/?#]\S*)?$/i;

const mask = (key: string) => '•'.repeat(Math.min(16, Math.max(8, key.length)));

export default function LepideIqPage() {
  const toast = useToast();
  const creds = adminStore.use((s) => s.iqCredentials);
  const [dialog, setDialog] = useState<{ mode: 'add' } | { mode: 'edit'; row: IqCredential } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IqCredential | null>(null);

  const cols = useMemo<Col<IqCredential>[]>(() => [
    { key: 'name', header: 'Lepide IQ name', sortable: true, tip: true, minWidth: 160 },
    { key: 'endpoint', header: 'API end point URL', sortable: true, tip: true, minWidth: 260 },
    { key: 'apiKey', header: 'API key', text: () => '', minWidth: 150,
      render: (c) => <span role="img" aria-label="API key hidden" style={{ letterSpacing: '.08em' }}>{mask(c.apiKey)}</span> },
    { key: 'model', header: 'Deployed model name', sortable: true, minWidth: 160 },
  ], []);
  const model = useTable(creds, cols);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    adminActions.deleteIqCredential(pendingDelete.id);
    toast({ variant: 'success', title: 'Credentials deleted', message: `${pendingDelete.name} was removed.` });
    setPendingDelete(null);
  };

  return (
    <>
      <HeaderActions>
        <Button variant="primary" icon="plus" onClick={() => setDialog({ mode: 'add' })}>Add Credential(s)</Button>
      </HeaderActions>

      <AdminTable model={model} cols={cols} rowKey={(c) => c.id} label="Lepide IQ credentials"
        empty={<EmptyState icon="sparkles" title="You haven’t added any Lepide IQ credentials yet. Please add them to explore the AI of Lepide" />}
        rowActions={(c) => (
          <>
            <IconButton icon="edit" label={`Edit ${c.name}`} data-tip="Edit" onClick={() => setDialog({ mode: 'edit', row: c })} />
            <IconButton icon="trash" danger label={`Delete ${c.name}`} data-tip="Delete" onClick={() => setPendingDelete(c)} />
          </>
        )} />

      <CredentialDialog state={dialog} others={creds} onClose={() => setDialog(null)} />
      <ConfirmDialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete}
        title="Delete credentials" confirmLabel="Delete"
        message={pendingDelete ? `Delete "${pendingDelete.name}"? Lepide IQ features that use it stop working.` : undefined} />
    </>
  );
}

type Form = { name: string; endpoint: string; apiKey: string; model: string };
const BLANK: Form = { name: '', endpoint: '', apiKey: '', model: '' };

/* DLG-SAD-05 · Add Credentials for Lepide IQ / Edit Credentials for Lepide IQ */
function CredentialDialog({ state, others, onClose }: {
  state: { mode: 'add' } | { mode: 'edit'; row: IqCredential } | null; others: IqCredential[]; onClose: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState<Form>(BLANK);
  const [tried, setTried] = useState(false);
  const editing = state?.mode === 'edit' ? state.row : null;

  useEffect(() => {
    if (!state) return;
    setF(state.mode === 'edit' ? { name: state.row.name, endpoint: state.row.endpoint, apiKey: state.row.apiKey, model: state.row.model } : BLANK);
    setTried(false);
  }, [state]);

  const errs = (() => {
    const e: Partial<Record<keyof Form, string>> = {};
    const name = f.name.trim(), endpoint = f.endpoint.trim();
    if (!name) e.name = 'Enter a name.';
    else if (others.some((o) => o.id !== editing?.id && o.name.trim().toLowerCase() === name.toLowerCase())) e.name = 'A credential with this name already exists.';
    if (!endpoint) e.endpoint = 'Enter the API end point URL.';
    else if (!HTTPS_RE.test(endpoint)) e.endpoint = 'Use a full https:// URL.';
    if (!f.apiKey.trim()) e.apiKey = 'Enter the API key.';
    if (!f.model.trim()) e.model = 'Enter the deployed model name.';
    return e;
  })();
  const show = (k: keyof Form) => (tried ? errs[k] : undefined);

  const apply = () => {
    setTried(true);
    const first = (['name', 'endpoint', 'apiKey', 'model'] as const).find((k) => errs[k]);
    if (first) {
      requestAnimationFrame(() => document.getElementById('iq-' + first)?.focus());
      toast({ variant: 'error', title: 'Check the highlighted fields', message: 'All four fields are required.' });
      return;
    }
    const v = { name: f.name.trim(), endpoint: f.endpoint.trim(), apiKey: f.apiKey.trim(), model: f.model.trim() };
    adminActions.saveIqCredential(editing ? { ...v, id: editing.id } : v);
    toast({ variant: 'success', title: editing ? 'Credentials updated' : 'Credentials added', message: `${v.name} is ready for Lepide IQ.` });
    onClose();
  };

  const upd = (k: keyof Form) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  return (
    <Modal open={!!state} onClose={onClose} icon={editing ? 'edit' : 'sparkles'}
      title={editing ? 'Edit Credentials for Lepide IQ' : 'Add Credentials for Lepide IQ'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={apply}>Apply</Button></>}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); apply(); }} style={{ display: 'contents' }}>
        <TextField id="iq-name" label="Lepide IQ name" placeholder={SAMPLE.name} value={f.name} onChange={upd('name')} error={show('name')} />
        <TextField id="iq-endpoint" label="API end point URL" placeholder={SAMPLE.endpoint} value={f.endpoint} onChange={upd('endpoint')} error={show('endpoint')} />
        <PasswordField id="iq-apiKey" label="API key" autoComplete="off" value={f.apiKey} onChange={upd('apiKey')} error={show('apiKey')} />
        <TextField id="iq-model" label="Deployed model name" placeholder={SAMPLE.model} value={f.model} onChange={upd('model')} error={show('model')} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
