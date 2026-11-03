import { useEffect, useState } from 'react';
import { Button, DataTable, Modal, PasswordField, RadioGroup, TextAreaField, TextField, useToast, type Column } from '../../../ui';
import { UntitledDialog } from '../configure-notifications/shared/UntitledDialog';
import { ProductGlyph } from './ProductGlyph';
import { SALES_EMAIL, type LicenseRow } from './store';

const ID_RE = /^[0-9]{4,}$/;

/** [Prototype-only] the licence request is a four-line text file downloaded by the browser. */
function downloadRequest(id: string) {
  const key = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const text = ['Lepide License Request', `License ID: ${id}`, `Requested On: ${new Date().toISOString()}`, `Request Key: ${key}`].join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url; a.download = `LicenseRequest_${id}.lic`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------------- DLG-SAD-39 · License Activation (+ DLG-SAD-40 License Request File) ---------------- */
export function LicenseActivationDialog({ open, onClose, onActivated }: { open: boolean; onClose: () => void; onActivated: (id: string) => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<'online' | 'offline'>('online');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [response, setResponse] = useState('');
  const [tried, setTried] = useState(false);
  const [requested, setRequested] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  useEffect(() => {
    if (open) { setMode('online'); setId(''); setPassword(''); setResponse(''); setTried(false); setRequested(false); setRequestOpen(false); }
  }, [open]);

  const errId = !id ? 'Enter your License ID.' : !ID_RE.test(id) ? 'License ID is the number on your licence email (digits only).' : null;
  const errPw = !password ? 'Enter the licence password.' : null;
  const errResp = mode === 'offline' && !response.trim() ? 'Paste the response you received from Lepide sales.' : null;

  const generate = () => {
    if (errId || errPw) {
      toast({ variant: 'error', title: 'License ID and Password required', message: 'Enter them before generating the request file.' });
      return;
    }
    downloadRequest(id);
    setRequested(true);
    setRequestOpen(true);
  };
  const activate = () => {
    setTried(true);
    if (errId || errPw || errResp) {
      toast({ variant: 'error', title: 'Check the highlighted fields', message: 'Fill in the required licence details to activate.' });
      return;
    }
    onActivated(id);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="License Activation" icon="key" size="md"
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={activate}>Activate</Button></>}>
        <RadioGroup row ariaLabel="Activation method" value={mode}
          onChange={(v) => { setMode(v as 'online' | 'offline'); setTried(false); }}
          options={[{ value: 'online', label: 'Activate Online' }, { value: 'offline', label: 'Activate Offline' }]} />
        <div className="fld-row">
          <TextField label="License ID" inputMode="numeric" maxLength={12} value={id} autoComplete="off"
            onChange={(v) => setId(v.replace(/[^0-9]/g, ''))} error={tried ? errId : null} />
          <PasswordField label="Password" value={password} autoComplete="new-password" onChange={setPassword} error={tried ? errPw : null} />
        </div>
        {mode === 'offline' && (
          <>
            <div className="license-management-generate">
              <Button icon="download" onClick={generate}>Generate license request</Button>
              {requested && <small className="help">Request file downloaded — send it to {SALES_EMAIL}.</small>}
            </div>
            <TextAreaField label="Response" rows={6} placeholder="Paste the response from Lepide sales here" value={response}
              onChange={setResponse} error={tried ? errResp : null} />
          </>
        )}
      </Modal>

      <UntitledDialog open={requestOpen} onClose={() => setRequestOpen(false)} label="License Request File" icon="info" heading="License Request File"
        footer={<Button variant="primary" data-autofocus onClick={() => {
          setRequestOpen(false);
          toast({ variant: 'info', title: 'Opening your email app', message: `Attach the request file and send it to ${SALES_EMAIL}.` });
        }}>Done</Button>}>
        <p>Your license request file has been downloading. Please send the file to <b>{SALES_EMAIL}</b> via email</p>
      </UntitledDialog>
    </>
  );
}

/* ---------------- DLG-SAD-41 · Expired License Details ---------------- */
export function ExpiredLicenseDialog({ open, onClose, rows }: { open: boolean; onClose: () => void; rows: LicenseRow[] }) {
  const columns: Column<LicenseRow>[] = [
    { key: 'product', header: 'Product', render: (r) => <span className="row"><ProductGlyph product={r.product} size={18} />{r.product}</span> },
    { key: 'platform', header: 'Platform' },
    { key: 'reason', header: 'Reason', value: () => 'License period has expired' },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Expired License Details" icon="alert" size="lg"
      footer={<Button variant="primary" onClick={onClose}>OK</Button>}>
      <DataTable flat columns={columns} rows={rows} rowKey={(r) => r.id} noun={['expired licence', 'expired licences']} />
    </Modal>
  );
}
