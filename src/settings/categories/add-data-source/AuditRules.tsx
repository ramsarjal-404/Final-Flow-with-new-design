import { useState } from 'react';
import {
  Button, ConfirmDialog, DataTable, DetailPanel, Dropdown, EmptyState, Icon, IconButton, Modal, RadioGroup, Segmented, SelectField, TextField, ToneTag, useToast,
} from '../../../ui';
import type { Column } from '../../../ui';
import { POLICY_OBJECT_KINDS, POLICY_OBJECT_VALUES, ds$, dsStore, newId } from './store';
import type { AuditPolicy, AuditRule, AuditTarget, DomainObject, PolicyObject, RuleUsers } from './store';
import { ConsoleChrome, MiniTable, RowCheck, WizardFrame, useInvalid } from './parts';
import DomainPicker from './DomainPicker';

/* SCR-SDS-05 Audit Rules & Policies + DLG-SDS-20…24. */

export default function AuditRules() {
  const toast = useToast();
  const rules = dsStore.use((s) => s.rules);
  const policies = dsStore.use((s) => s.policies);
  const [tab, setTab] = useState<'rules' | 'policies'>('rules');
  const [editor, setEditor] = useState<{ editId?: string } | null>(null);
  const [policyDlg, setPolicyDlg] = useState<{ editId?: string } | null>(null);
  // GAP-SDS-05 intended: the first policy is selected initially.
  const [selPolicy, setSelPolicy] = useState<string | null>(policies[0]?.id ?? null);
  const [details, setDetails] = useState<AuditRule | null>(null);
  const [del, setDel] = useState<{ kind: 'rule' | 'policy'; id: string; name: string } | null>(null);

  if (editor) {
    return <RuleEditor editId={editor.editId} onClose={() => setEditor(null)} onSaved={() => setEditor(null)} />;
  }

  const ruleCols: Column<AuditRule>[] = [
    { key: 'name', header: 'Rule Name', sortable: true, filterable: true, minWidth: 150, render: (r) => <b>{r.name}</b> },
    { key: 'servers', header: 'Rule Summary', sortable: true, filterable: true, minWidth: 220, value: (r) => r.servers.join(', ') },
    { key: 'policy', header: 'Policy Name', sortable: true, filterable: true, minWidth: 150 },
    {
      key: 'enabled', header: 'Rule Status', sortable: true, filterable: true, minWidth: 130, value: (r) => (r.enabled ? 'Enabled' : 'Disabled'),
      render: (r) => (
        <button type="button" className="add-data-source-status-btn" data-tip="Click to enable / disable" aria-label={`${r.name}: ${r.enabled ? 'Enabled' : 'Disabled'}. Click to enable / disable`}
          onClick={() => {
            ds$.saveRule({ ...r, enabled: !r.enabled });
            toast({ variant: 'success', title: r.enabled ? 'Rule disabled' : 'Rule enabled', message: r.name });
          }}>
          <ToneTag tone={r.enabled ? 'good' : 'bad'}>{r.enabled ? 'Enabled' : 'Disabled'}</ToneTag>
        </button>
      ),
    },
    {
      key: 'users', header: 'Rule Users', sortable: true, filterable: true, minWidth: 170,
      render: (r) => <span className="row">{r.users}<button type="button" className="add-data-source-linkbtn" onClick={() => setDetails(r)}>Details</button></span>,
    },
    {
      key: 'actions', header: 'Actions', width: 100,
      render: (r) => (
        <span className="row" style={{ gap: 4 }}>
          <IconButton icon="trash" danger label={`Delete ${r.name}`} onClick={() => setDel({ kind: 'rule', id: r.id, name: r.name })} />
          <IconButton icon="edit" label={`Edit ${r.name}`} onClick={() => setEditor({ editId: r.id })} />
        </span>
      ),
    },
  ];

  const polCols: Column<AuditPolicy>[] = [
    { key: 'name', header: 'Policy Name', minWidth: 170 },
    { key: 'description', header: 'Description', minWidth: 180, value: (p) => p.description || '-' },
    {
      key: 'actions', header: 'Action', width: 100,
      render: (p) => (
        <span className="row" style={{ gap: 4 }}>
          <IconButton icon="trash" danger label={`Delete ${p.name}`} onClick={() => {
            // GAP-SDS-31 intended: warn before confirming when a rule still uses the policy.
            if (rules.some((r) => r.policy === p.name)) { toast({ variant: 'error', title: 'Policy in use', message: `${p.name} is used by a rule. Change those rules first.` }); return; }
            setDel({ kind: 'policy', id: p.id, name: p.name });
          }} />
          <IconButton icon="edit" label={`Edit ${p.name}`} onClick={() => setPolicyDlg({ editId: p.id })} />
        </span>
      ),
    },
  ];
  const sel = policies.find((p) => p.id === selPolicy) ?? null;

  return (
    <ConsoleChrome current="rules" title="Audit Rules & Policies" crumbs={[{ label: 'Audit Rule & Policy' }]} icon="shield">
      <div className="row row--between row--wrap">
        <Segmented hug ariaLabel="Rules or policies" value={tab} onChange={(v) => setTab(v as 'rules' | 'policies')}
          items={[{ value: 'rules', label: 'Rules' }, { value: 'policies', label: 'Policies' }]} />
        {tab === 'rules'
          ? <Button variant="primary" icon="plus" onClick={() => setEditor({})}>Add rules</Button>
          : <Button variant="primary" icon="plus" onClick={() => setPolicyDlg({})}>Add policy</Button>}
      </div>
      {tab === 'rules' ? (
        <DataTable columns={ruleCols} rows={rules} rowKey={(r) => r.id} noun={['rule', 'rules']}
          empty={<EmptyState compact icon="shield" title="No rules yet. Click Add Rules to create one." />} />
      ) : (
        <div className="with-detail">
          <DataTable columns={polCols} rows={policies} rowKey={(p) => p.id} noun={['policy', 'policies']} activeKey={selPolicy}
            onRowOpen={(p) => setSelPolicy(p.id)}
            empty={<EmptyState compact icon="file" title="No policies yet. Click Add Policy to create one." />} />
          {sel ? (
            <DetailPanel title={`Policy Details — ${sel.name}`} onClose={() => setSelPolicy(null)}>
              <PolicyGroups policy={sel} />
            </DetailPanel>
          ) : (
            <section className="lf-card detail"><EmptyState compact icon="file" title="Select a policy to see its details." /></section>
          )}
        </div>
      )}

      {policyDlg && <PolicyDialog editId={policyDlg.editId} onClose={() => setPolicyDlg(null)} onSaved={(p) => { setPolicyDlg(null); setSelPolicy(p.id); }} />}
      {details && (
        <Modal open onClose={() => setDetails(null)} title={`Rule users — ${details.name}`} icon="users" size="sm"
          footer={<Button variant="primary" onClick={() => setDetails(null)}>Close</Button>}>
          <b>{details.users}</b>
          {details.users === 'All users' || details.targets.length === 0
            ? <p className="add-data-source-note">This rule audits every user.</p>
            : <ul className="add-data-source-bullets">{details.targets.map((t) => <li key={t.name}>{t.name} ({t.type})</li>)}</ul>}
        </Modal>
      )}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} confirmLabel="Delete" title={del?.kind === 'policy' ? 'Delete policy' : 'Delete rule'}
        message={del ? `Delete "${del.name}"? This can't be undone.` : undefined}
        onConfirm={() => {
          const d = del!; setDel(null);
          if (d.kind === 'rule') {
            dsStore.set((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== d.id) }));
            toast({ variant: 'success', title: 'Rule deleted', message: d.name });
          } else {
            if (dsStore.get().rules.some((r) => r.policy === d.name)) { toast({ variant: 'error', title: 'Policy in use', message: `${d.name} is used by a rule. Change those rules first.` }); return; }
            dsStore.set((s) => ({ ...s, policies: s.policies.filter((p) => p.id !== d.id) }));
            if (selPolicy === d.id) setSelPolicy(null);
            toast({ variant: 'success', title: 'Policy deleted', message: d.name });
          }
        }} />
    </ConsoleChrome>
  );
}

const GROUPS: { title: string; kind: string }[] = [
  { title: 'Included Directories', kind: 'Directory' }, { title: 'Included Events', kind: 'Event' }, { title: 'Included File Masks', kind: 'File Mask' },
  { title: 'Included Processes', kind: 'Process' }, { title: 'Monitoring Time', kind: 'Monitoring Time' },
];
function PolicyGroups({ policy }: { policy: AuditPolicy }) {
  const [closed, setClosed] = useState<string[]>([]);
  return (
    <div>
      {GROUPS.map((g) => {
        const objs = policy.objects.filter((o) => o.kind === g.kind);
        const open = !closed.includes(g.kind);
        return (
          <div key={g.kind} className="add-data-source-group">
            <button type="button" className="add-data-source-group__btn" aria-expanded={open} onClick={() => setClosed((c) => (open ? [...c, g.kind] : c.filter((x) => x !== g.kind)))}>
              {g.title}<Icon name="chevron" size={14} />
            </button>
            {open && <ul>{objs.length ? objs.map((o) => <li key={o.id}>{o.value}{o.include ? '' : ' (excluded)'}</li>) : <li>None</li>}</ul>}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- DLG-SDS-20 Create New Rule / Edit Rule ---------------- */
const AUDIT_USER: { ui: string; data: RuleUsers }[] = [
  { ui: 'All Users', data: 'All users' }, { ui: 'Selected Users', data: 'Specific users' }, { ui: 'Exclude Users', data: 'Excluded users' },
];

export function RuleEditor({ editId, presetServers, allowExisting, onClose, onSaved }: {
  editId?: string; presetServers?: string[]; allowExisting?: boolean; onClose: () => void; onSaved: (r: AuditRule) => void;
}) {
  const toast = useToast();
  const st = dsStore.use();
  const editing = editId ? st.rules.find((r) => r.id === editId) ?? null : null;
  const policyNames = st.policies.map((p) => p.name);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [existing, setExisting] = useState('');
  const [name, setName] = useState(editing?.name ?? '');
  const [servers, setServers] = useState<string[]>(editing?.servers ?? presetServers ?? []);
  const [ptype, setPtype] = useState('selected');
  const [policy, setPolicy] = useState(() => (editing && policyNames.includes(editing.policy) ? editing.policy : policyNames.includes('Audit All') ? 'Audit All' : policyNames[0] ?? ''));
  const [auditUser, setAuditUser] = useState(editing ? AUDIT_USER.find((a) => a.data === editing.users)!.ui : 'All Users');
  const [targets, setTargets] = useState<AuditTarget[]>(editing?.targets ?? []);
  const [viewAll, setViewAll] = useState(false);
  const [newPolicy, setNewPolicy] = useState(false);
  const [picker, setPicker] = useState<'user' | 'group' | null>(null);
  const v = useInvalid();
  const ex = mode === 'existing';
  const locked = !!presetServers;
  const all = auditUser === 'All Users';

  const done = () => {
    if (ex) {
      const r = st.rules.find((x) => x.id === existing);
      if (!r) { v.mark(['existing']); toast({ variant: 'error', title: 'Select a rule', message: 'Choose the existing rule to apply.' }); return; }
      const merged = { ...r, servers: Array.from(new Set([...r.servers, ...(presetServers ?? [])])) };
      ds$.saveRule(merged);
      toast({ variant: 'success', title: 'Rule applied', message: `${r.name} now covers ${(presetServers ?? []).join(', ')}.` });
      onSaved(merged); return;
    }
    const n = name.trim();
    if (!n) { v.mark(['name']); toast({ variant: 'error', title: 'Rule Name required', message: 'Enter a name for the rule.' }); return; }
    if (!servers.length) { v.mark(['servers']); toast({ variant: 'error', title: 'File Server required', message: 'Choose at least one file server (View All).' }); return; }
    if (st.rules.some((r) => r.id !== editing?.id && r.name.toLowerCase() === n.toLowerCase())) { v.mark(['name']); toast({ variant: 'error', title: 'Name in use', message: `A rule named ${n} already exists.` }); return; }
    if (!all && !targets.length) { toast({ variant: 'error', title: 'Users required', message: 'Add the users or groups this rule applies to.' }); return; }
    const rule: AuditRule = {
      id: editing?.id ?? newId('r'), name: n, servers,
      policy: ptype === 'selected' ? policy : ptype === 'individual' ? 'Individual User Policy' : 'Group Policy',
      users: AUDIT_USER.find((a) => a.ui === auditUser)!.data, targets: all ? [] : targets,
      enabled: editing?.enabled ?? true, priority: editing?.priority ?? st.rules.length + 1,
    };
    ds$.saveRule(rule);
    toast({ variant: 'success', title: editing ? 'Rule updated' : 'Rule created', message: `${n} applies to ${servers.length} file server(s).` });
    onSaved(rule);
  };

  const addTargets = (objs: DomainObject[]) => {
    setPicker(null);
    setTargets((t) => {
      const out = [...t];
      for (const o of objs) if (!out.some((x) => x.name === o.name)) out.push({ name: o.name, type: o.objectClass === 'group' ? 'Group' : 'User' });
      return out;
    });
  };

  return (
    <>
      <WizardFrame root="Audit Rules & Policies" crumb={editing ? 'Edit Rule' : 'Create New Rule'} onClose={onClose}
        footer={<><span className="spacer" /><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
        {allowExisting && (
          <RadioGroup row ariaLabel="Rule" value={mode} onChange={(x) => { setMode(x as 'new' | 'existing'); v.mark([]); }}
            options={[{ value: 'new', label: 'Create new rule' }, { value: 'existing', label: 'Use existing rule' }]} />
        )}
        <h4 className="add-data-source-sub">Create new rule to apply on selected file server(s)</h4>
        <div className="add-data-source-two">
          {ex ? (
            <SelectField label="Rule Name" value={existing} placeholder="Select" aria-invalid={v.inv('existing')}
              options={st.rules.map((r) => ({ value: r.id, label: r.name }))} onChange={(x) => { setExisting(x); v.clear('existing'); }} />
          ) : (
            <TextField label="Rule Name" value={name} placeholder="Rule_$01_%" maxLength={256} aria-invalid={v.inv('name')} onChange={(x) => { setName(x); v.clear('name'); }} />
          )}
          <div className="add-data-source-inline">
            <TextField label="File Server" value={servers.join(', ')} readOnly disabled={ex || locked} placeholder="Click View All to choose" aria-invalid={v.inv('servers')} />
            <Button disabled={ex || locked} onClick={() => setViewAll(true)}>View all</Button>
          </div>
        </div>
        <h4 className="add-data-source-sub">Select Policy Type</h4>
        <div className="stack stack--sm">
          <div className="add-data-source-inline">
            <RadioGroup ariaLabel="Selected Policy" value={ptype} onChange={setPtype} options={[{ value: 'selected', label: 'Selected Policy', disabled: ex }]} />
            <SelectField aria-label="Policy" value={policy} options={policyNames} disabled={ex || ptype !== 'selected'} onChange={setPolicy} />
            <Button icon="plus" disabled={ex} onClick={() => setNewPolicy(true)}>Create new policy</Button>
          </div>
          <RadioGroup ariaLabel="Policy type" value={ptype} onChange={setPtype}
            options={[{ value: 'individual', label: 'Individual User Policy', disabled: ex }, { value: 'group', label: 'Group Policy', disabled: ex }]} />
        </div>
        <h4 className="add-data-source-sub">Select user or group to audit</h4>
        <div className="add-data-source-inline">
          <SelectField label="Audit User" value={auditUser} options={AUDIT_USER.map((a) => a.ui)} disabled={ex} onChange={setAuditUser} />
          <Button icon="user_plus" disabled={ex || all} onClick={() => setPicker('user')}>Add user</Button>
          <Button icon="users" disabled={ex || all} onClick={() => setPicker('group')}>Add group</Button>
        </div>
        <MiniTable label="Users and groups to audit" head={<><th>Name</th><th>Type</th><th style={{ width: 90 }}>Actions</th></>}>
          {all || targets.length === 0
            ? <tr className="add-data-source-empty-row"><td colSpan={3}>{all ? 'All users are audited.' : 'Add users or groups.'}</td></tr>
            : targets.map((t) => (
              <tr key={t.name} className="lf-row" style={{ cursor: 'default' }}>
                <td>{t.name}</td><td>{t.type}</td>
                <td><IconButton icon="trash" danger label={`Remove ${t.name}`} disabled={ex} onClick={() => setTargets((x) => x.filter((y) => y.name !== t.name))} /></td>
              </tr>
            ))}
        </MiniTable>
      </WizardFrame>

      {viewAll && (
        <Modal open onClose={() => setViewAll(false)} title="Select file server(s)" icon="server" size="sm"
          footer={<><Button onClick={() => setViewAll(false)}>Cancel</Button><Button variant="primary" onClick={() => setViewAll(false)}>Done</Button></>}>
          <div className="add-data-source-checks" role="group" aria-label="File servers">
            {st.servers.map((s) => (
              <RowCheck key={s.id} label={`${s.name} — ${s.domain}`} checked={servers.includes(s.name)}
                onChange={(on) => { setServers((x) => (on ? [...x, s.name] : x.filter((y) => y !== s.name))); v.clear('servers'); }}>{s.name} — {s.domain}</RowCheck>
            ))}
          </div>
        </Modal>
      )}
      {newPolicy && <PolicyDialog onClose={() => setNewPolicy(false)} onSaved={(p) => { setNewPolicy(false); setPolicy(p.name); setPtype('selected'); }} />}
      {picker && (
        <DomainPicker kind="users" multi title={picker === 'user' ? 'Add Users from Domain' : 'Add Groups from Domain'}
          onClose={() => setPicker(null)} onDone={(objs) => addTargets(objs)} />
      )}
    </>
  );
}

/* ---------------- DLG-SDS-22 Policy dialog ---------------- */
export function PolicyDialog({ editId, onClose, onSaved }: { editId?: string; onClose: () => void; onSaved: (p: AuditPolicy) => void }) {
  const toast = useToast();
  const policies = dsStore.use((s) => s.policies);
  const editing = editId ? policies.find((p) => p.id === editId) ?? null : null;
  const [name, setName] = useState(editing?.name ?? '');
  const [desc, setDesc] = useState(editing?.description ?? '');
  const [kind, setKind] = useState(POLICY_OBJECT_KINDS[0]);
  const [objects, setObjects] = useState<PolicyObject[]>(editing ? editing.objects.map((o) => ({ ...o })) : []);
  const v = useInvalid();
  const patch = (id: string, p: Partial<PolicyObject>) => setObjects((os) => os.map((o) => (o.id === id ? { ...o, ...p } : o)));

  const done = () => {
    const n = name.trim();
    if (!n) { v.mark(['name']); toast({ variant: 'error', title: 'Policy Name required', message: 'Enter a name for the policy.' }); return; }
    if (policies.some((p) => p.id !== editing?.id && p.name.toLowerCase() === n.toLowerCase())) { v.mark(['name']); toast({ variant: 'error', title: 'Name in use', message: `A policy named ${n} already exists.` }); return; }
    const p: AuditPolicy = { id: editing?.id ?? newId('p'), name: n, description: desc.trim(), objects };
    ds$.savePolicy(p);
    toast({ variant: 'success', title: editing ? 'Policy updated' : 'Policy created', message: n });
    onSaved(p);
  };

  return (
    <Modal open onClose={onClose} title="Enter policy name, description and add object(s)" subtitle="Enter policy name and click Add button to add objects." icon="file" size="lg"
      footerHint={'All type of access to "All drives, directories and files" by all processes will be audited.'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={done}>Done</Button></>}>
      <div className="add-data-source-two">
        <TextField label={<>Policy Name <span className="add-data-source-req" aria-hidden="true">*</span></>} required value={name} maxLength={256} aria-invalid={v.inv('name')} onChange={(x) => { setName(x); v.clear('name'); }} />
        <TextField label="Description" value={desc} maxLength={512} onChange={setDesc} />
      </div>
      <div className="add-data-source-inline">
        <SelectField label="Objects" value={kind} options={POLICY_OBJECT_KINDS} onChange={setKind} />
        <Button icon="plus" onClick={() => setObjects((os) => [...os, { id: newId('o'), kind, value: POLICY_OBJECT_VALUES[kind][0], include: true }])}>Add</Button>
      </div>
      <MiniTable label="Policy objects" head={<><th>Name</th><th style={{ width: 90 }}>Actions</th></>}>
        {objects.length === 0 ? <tr className="add-data-source-empty-row"><td colSpan={2}>-</td></tr> : objects.map((o) => (
          <tr key={o.id} className="lf-row" style={{ cursor: 'default' }}>
            <td className="td-wrap">
              <div className="row row--wrap" style={{ gap: 12, padding: '6px 0' }}>
                <b style={{ minWidth: 120 }}>› {o.kind}</b>
                <RadioGroup row ariaLabel={`Include or exclude ${o.kind}`} value={o.include ? 'include' : 'exclude'} onChange={(x) => patch(o.id, { include: x === 'include' })}
                  options={[{ value: 'include', label: 'Include' }, { value: 'exclude', label: 'Exclude' }]} />
                <Dropdown size="sm" className="add-data-source-dd" style={{ maxWidth: 240 }} ariaLabel={`${o.kind} value`} value={o.value}
                  onChange={(v) => patch(o.id, { value: v })} options={POLICY_OBJECT_VALUES[o.kind]} />
              </div>
            </td>
            <td><IconButton icon="trash" danger label={`Remove ${o.kind}`} onClick={() => setObjects((os) => os.filter((x) => x.id !== o.id))} /></td>
          </tr>
        ))}
      </MiniTable>
    </Modal>
  );
}
