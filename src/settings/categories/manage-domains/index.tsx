import { useEffect, useState } from 'react';
import { Button, ConfirmDialog, DataTable, EmptyState, IconButton, Modal, PasswordField, SearchField, TextField, useToast, type Column } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { adminActions, adminStore, type ManagedDomain } from '../../../stores/admin';
import { DOMAIN_RE, isHostOrIpv4 } from '../general/kit';

/* SCR-SAD-11 · Manage Domains with DLG-SAD-22 (Add / Edit Domain) and DLG-SAD-23 (Delete Domain).
   Domains feed the member picker's "Select Domain" (DLG-SAD-02). */

const COLS: Column<ManagedDomain>[] = [
  { key: 'domain', header: 'Domain', sortable: true, minWidth: 180 },
  { key: 'controller', header: 'Domain controller Name/IP', sortable: true, minWidth: 200 },
  { key: 'logonName', header: 'Logon Name', sortable: true, minWidth: 220 },
];

export default function ManageDomainsPage() {
  const toast = useToast();
  const domains = adminStore.use((s) => s.domains);
  const members = adminStore.use((s) => s.members);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ row: ManagedDomain | null } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManagedDomain | null>(null);

  const memberCount = pendingDelete ? members.filter((m) => m.domain.toLowerCase() === pendingDelete.domain.toLowerCase()).length : 0;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    adminActions.deleteDomain(pendingDelete.id);
    toast({ variant: 'success', title: 'Domain deleted', message: `${pendingDelete.domain} was removed.` });
    setPendingDelete(null);
  };

  return (
    <>
      <HeaderActions>
        <SearchField value={search} onChange={setSearch} placeholder="Search" ariaLabel="Search domains" style={{ width: 240 }} />
        <Button variant="primary" icon="plus" onClick={() => setDialog({ row: null })}>Add domain</Button>
      </HeaderActions>

      <DataTable columns={COLS} rows={domains} rowKey={(d) => d.id} search={search} noun={['domain', 'domains']}
        pageSizes={[10, 20, 50, 100]} defaultPageSize={50}
        empty={<EmptyState compact icon="globe" title="You don't have any domain(s) here, please click on Add Domain button to add a new domain." />}
        rowActions={(d) => (
          <>
            <IconButton icon="trash" danger label={`Delete ${d.domain}`} data-tip="Delete domain" onClick={() => setPendingDelete(d)} />
            <IconButton icon="edit" label={`Edit ${d.domain}`} data-tip="Edit domain" onClick={() => setDialog({ row: d })} />
          </>
        )} />

      <DomainDialog state={dialog} domains={domains} onClose={() => setDialog(null)} />
      <ConfirmDialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} onConfirm={confirmDelete}
        title="Delete Domain" confirmLabel="Delete"
        message={pendingDelete ? `Delete ${pendingDelete.domain}? Lepide stops reading users and groups from it.` + (memberCount ? ` ${memberCount} existing member(s) from this domain keep their role.` : '') : undefined} />
    </>
  );
}

type Form = { domain: string; controller: string; logonName: string; password: string };
const BLANK: Form = { domain: '', controller: '', logonName: '', password: '' };

/* DLG-SAD-22 · Add Domain / Edit Domain */
function DomainDialog({ state, domains, onClose }: { state: { row: ManagedDomain | null } | null; domains: ManagedDomain[]; onClose: () => void }) {
  const toast = useToast();
  const editing = state?.row ?? null;
  const [f, setF] = useState<Form>(BLANK);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  useEffect(() => {
    if (!state) return;
    const r = state.row;
    setF(r ? { domain: r.domain, controller: r.controller, logonName: r.logonName, password: r.password } : BLANK);
    setErrors({});
  }, [state]);

  const upd = (k: keyof Form) => (v: string) => { setF((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const apply = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    const domain = f.domain.trim(), controller = f.controller.trim(), logonName = f.logonName.trim();
    if (!editing) {
      if (!domain) e.domain = 'Please enter the domain name.';
      else if (!DOMAIN_RE.test(domain)) e.domain = 'Enter a valid domain name, e.g. corp.example.com.';
      else if (domains.some((d) => d.domain.toLowerCase() === domain.toLowerCase())) e.domain = 'This domain is already added.';
    }
    if (!controller) e.controller = 'Please enter the domain controller name or IP.';
    else if (!isHostOrIpv4(controller)) e.controller = 'Enter a valid host name or IPv4 address.';
    if (!logonName) e.logonName = 'Please enter the user name.';
    if (!f.password) e.password = 'Please enter the password.';
    setErrors(e);
    const first = (['domain', 'controller', 'logonName', 'password'] as const).find((k) => e[k]);
    if (first) { requestAnimationFrame(() => document.getElementById('dom-' + first)?.focus()); return; }
    if (editing) {
      adminActions.saveDomain({ id: editing.id, domain: editing.domain, controller, logonName, password: f.password });
      toast({ variant: 'success', title: 'Domain updated', message: `${editing.domain} was updated.` });
    } else {
      adminActions.saveDomain({ domain, controller, logonName, password: f.password });
      toast({ variant: 'success', title: 'Domain added', message: `${domain} is now managed and can be used in Role Management.` });
    }
    onClose();
  };

  return (
    <Modal open={!!state} onClose={onClose} title={editing ? 'Edit Domain' : 'Add domain'} icon={editing ? 'edit' : 'globe'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={apply}>Apply</Button></>}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); apply(); }} style={{ display: 'contents' }}>
        <TextField id="dom-domain" label="Domain Name" placeholder="e.g. corp.example.com" maxLength={253} value={f.domain}
          disabled={!!editing} onChange={upd('domain')} error={errors.domain} />
        <TextField id="dom-controller" label="Domain controller Name / IP :" placeholder="e.g. 192.168.70.12" maxLength={253} value={f.controller}
          onChange={upd('controller')} error={errors.controller} />
        <TextField id="dom-logonName" label="User Name:" placeholder="e.g. admin@corp.example.com" maxLength={200} autoComplete="off" value={f.logonName}
          onChange={upd('logonName')} error={errors.logonName} />
        <PasswordField id="dom-password" label="Password:" maxLength={200} autoComplete="new-password" value={f.password}
          onChange={upd('password')} error={errors.password} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
