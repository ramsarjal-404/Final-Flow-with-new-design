import { useState } from 'react';
import { Button, SetCard, TextField, useToast } from '../../../ui';
import { adminActions, adminStore } from '../../../stores/admin';

/* SCR-SAD-10 · Application URL — the console address Lepide puts in links inside emailed reports
   and alerts. A single form card (Lepide Design System recipe § 11); Enter submits. */

function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname && /^https?:\/\/[^/?#\s]/i.test(v);
  } catch { return false; }
}

export default function ApplicationUrlPage() {
  const toast = useToast();
  const saved = adminStore.use((s) => s.appUrl);
  const [value, setValue] = useState(saved);
  const [error, setError] = useState<string | null>(null);

  const update = () => {
    const v = value.trim();
    const fail = (msg: string) => { setError(msg); document.getElementById('app-url')?.focus(); };
    if (!v) return fail('Please enter the application URL.');
    if (!isHttpUrl(v)) return fail('Enter a valid URL starting with http:// or https://, e.g. https://lepide.example.com');
    setValue(v);
    if (v === saved) { toast({ variant: 'info', title: 'No changes', message: 'The application URL is already set to this address.' }); return; }
    adminActions.setAppUrl(v);
    toast({ variant: 'success', title: 'Application URL updated', message: `Links in reports and alerts now open ${v}.` });
  };

  return (
    <form noValidate className="page-form" onSubmit={(e) => { e.preventDefault(); update(); }}>
      <SetCard footer={<Button type="submit" variant="primary">Update</Button>}>
        <div className="form-col">
          <TextField id="app-url" label="Application URL:" type="url" maxLength={2048} placeholder="https://lepide.example.com"
            value={value} error={error} onChange={(v) => { setValue(v); setError(null); }} />
        </div>
      </SetCard>
    </form>
  );
}
