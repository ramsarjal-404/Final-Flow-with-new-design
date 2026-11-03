import { useEffect, useMemo, useState } from 'react';
import { Button, ConfirmDialog, EmptyState, Icon, IconButton, Modal, Segmented, SetCard, useToast } from '../../../ui';
import {
  CATALOG, FAMILY_LABEL, FAMILY_LOGO, KIND_LABEL, KIND_LOGO, M365_APPS, coveringConnections, familyOf, isCloud, mcStore,
} from './store';
import type { Connection, Family, Kind, WizardReq } from './store';
import ComponentWizard from './ComponentWizard';
import './styles.css';

/* SCR-SDS-08 Manage Components panel + DLG-SDS-31…34; hosts DLG-SDS-35 as a full-page wizard
   (Lepide Design System: 3+ steps → full page). */

const Img = ({ src, size = 28 }: { src: string; size?: number }) => (
  <img src={src} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain' }} />
);

export function ManageComponents() {
  const toast = useToast();
  const connections = mcStore.use((s) => s.connections);
  const wizard = mcStore.use((s) => s.wizard);
  const [picker, setPicker] = useState<Family | null>(null);
  const [creds, setCreds] = useState<{ family: Family; id: string | null } | null>(null);

  // leaving the page closes a wizard that was open (it is mounted fresh on every open)
  useEffect(() => () => mcStore.set((s) => ({ ...s, wizard: null })), []);

  const openWizard = (req: WizardReq) => { setPicker(null); setCreds(null); mcStore.set((s) => ({ ...s, wizard: req })); };
  const closeWizard = () => mcStore.set((s) => ({ ...s, wizard: null }));

  if (wizard) {
    return (
      <ComponentWizard key={JSON.stringify(wizard)} req={wizard}
        onCancel={() => {
          closeWizard();
          if (wizard.returnTo !== undefined) setCreds({ family: wizard.family, id: wizard.returnTo ?? null });
        }}
        onSaved={(c, edit) => {
          mcStore.set((s) => ({
            ...s, wizard: null,
            connections: edit ? s.connections.map((x) => (x.id === c.id ? c : x)) : [...s.connections, c],
          }));
          const fl = FAMILY_LABEL[c.family];
          if (edit) {
            toast({ variant: 'success', title: 'Credentials updated', message: `${c.name} (${fl}) has been updated.` });
            setCreds({ family: c.family, id: c.id });
          } else {
            toast({ variant: 'success', title: 'Component added', message: `${c.name} is now configured for ${fl}.` });
          }
        }} />
    );
  }

  const available = CATALOG.filter((k) => coveringConnections(connections, k).length === 0);
  const added = CATALOG.filter((k) => coveringConnections(connections, k).length > 0);

  const addFor = (k: Kind) => {
    const f = familyOf(k);
    openWizard({ mode: 'add', family: f, kind: k });
  };

  return (
    <>
      <SetCard title="Components">
        {available.length ? (
          <div className="pick-grid manage-component-tiles">
            {available.map((k) => (
              <button key={k} type="button" className="pick manage-component-tile" aria-label={`Configure ${KIND_LABEL[k]}`} title={`Configure ${KIND_LABEL[k]}`} onClick={() => addFor(k)}>
                <span className="pick__ic"><Img src={KIND_LOGO[k]} size={26} /></span>
                <span className="pick__text"><b>{KIND_LABEL[k]}</b></span>
                <span className="manage-component-tile__add" aria-hidden="true"><Icon name="plus" size={14} /></span>
              </button>
            ))}
          </div>
        ) : <EmptyState compact icon="check" title="All components are added. Select an added component below to edit it." />}
      </SetCard>
      <SetCard title="Added components">
        {added.length ? (
          <div className="pick-grid manage-component-tiles">
            {added.map((k) => {
              const cov = coveringConnections(connections, k);
              return (
                <button key={k} type="button" className="pick manage-component-tile manage-component-tile--added" aria-label={`Manage ${KIND_LABEL[k]}`} title={`Manage ${KIND_LABEL[k]}`}
                  onClick={() => setPicker(familyOf(k))}>
                  <span className="pick__ic"><Img src={KIND_LOGO[k]} size={26} /></span>
                  <span className="pick__text"><b>{KIND_LABEL[k]}</b><span>{cov.length === 1 ? cov[0].name : `${cov.length} configured`}</span></span>
                  <span className="pick__check" aria-hidden="true"><Icon name="check" /></span>
                </button>
              );
            })}
          </div>
        ) : <EmptyState compact icon="layers" title="No components added yet. Select a component above to configure it." />}
      </SetCard>

      {picker && (
        <InstancePicker family={picker} connections={connections.filter((c) => c.family === picker)} onClose={() => setPicker(null)}
          onAdd={() => openWizard({ mode: 'add', family: picker, kind: picker === 'm365' ? undefined : (picker as Kind) })}
          onPick={(id) => { setPicker(null); setCreds({ family: picker, id }); }} />
      )}
      {creds && (
        <CredentialsDialog family={creds.family} selectedId={creds.id} connections={connections.filter((c) => c.family === creds.family)}
          onSelect={(id) => setCreds({ ...creds, id })} onClose={() => setCreds(null)}
          onAdd={(retId) => openWizard({ mode: 'add', family: creds.family, kind: creds.family === 'm365' ? undefined : (creds.family as Kind), returnTo: retId })}
          onEdit={(c) => openWizard({ mode: 'edit', family: c.family, editId: c.id, returnTo: c.id })}
          onDelete={(c) => {
            const fam = connections.filter((x) => x.family === c.family);
            const idx = fam.findIndex((x) => x.id === c.id);
            const rest = fam.filter((x) => x.id !== c.id);
            mcStore.set((s) => ({ ...s, connections: s.connections.filter((x) => x.id !== c.id) }));
            setCreds({ family: c.family, id: rest.length ? rest[Math.min(idx, rest.length - 1)].id : null });
            toast({ variant: 'success', title: 'Deleted', message: `${c.name} was removed from ${FAMILY_LABEL[c.family]}.` });
          }} />
      )}
    </>
  );
}

/* ---------------- DLG-SDS-31 Instance picker ---------------- */
function InstancePicker({ family, connections, onClose, onAdd, onPick }: {
  family: Family; connections: Connection[]; onClose: () => void; onAdd: () => void; onPick: (id: string) => void;
}) {
  const fl = FAMILY_LABEL[family];
  return (
    <Modal open onClose={onClose} title={fl} icon="layers" size="md">
      <p className="manage-component-lead">Select a {fl} component to edit or configure.</p>
      <div className="pick-grid manage-component-tiles">
        <button type="button" className="pick manage-component-tile manage-component-tile--new" onClick={onAdd}>
          <span className="pick__ic"><Icon name="plus" /></span>
          <span className="pick__text"><b>Add New {fl}</b></span>
        </button>
        {connections.map((c) => (
          <button key={c.id} type="button" className="pick manage-component-tile manage-component-tile--added" onClick={() => onPick(c.id)}>
            <span className="pick__ic"><Img src={FAMILY_LOGO[family]} size={24} /></span>
            <span className="pick__text"><b>{c.name}</b><span>Added</span></span>
            <span className="pick__check" aria-hidden="true"><Icon name="check" /></span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/* ---------------- DLG-SDS-32 Edit Credentials ---------------- */
const scopeText = (mode: string, n: number, allText: string) =>
  mode === 'all' ? allText : mode === 'selected' ? `Selected Only (${n})` : `All But Excluding Selected (${n})`;

function CredentialsDialog({ family, selectedId, connections, onSelect, onClose, onAdd, onEdit, onDelete }: {
  family: Family; selectedId: string | null; connections: Connection[]; onSelect: (id: string) => void; onClose: () => void;
  onAdd: (returnId: string | null) => void; onEdit: (c: Connection) => void; onDelete: (c: Connection) => void;
}) {
  const fl = FAMILY_LABEL[family];
  const cloud = isCloud(family);
  const [viewAll, setViewAll] = useState(false);
  const [confirm, setConfirm] = useState<Connection | null>(null);
  const sel = connections.find((c) => c.id === selectedId) ?? connections[0] ?? null;
  const pills = useMemo(() => {
    let first = connections.slice(0, 4);
    if (sel && !first.some((c) => c.id === sel.id)) first = [...first.slice(0, 3), sel];
    return first;
  }, [connections, sel]);
  const title = family === 'm365' ? 'Added Data Source for Microsoft 365 Directory' : `Edit Credentials for ${fl}`;

  return (
    <>
      <Modal open onClose={onClose} title={title} icon="layers" size="lg" escapeCloses={!viewAll && !confirm}
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onClose}>Done</Button></>}>
        {sel ? (
          <>
            <div className="row row--wrap row--between">
              <div className="row row--wrap">
                <Segmented hug ariaLabel={`${fl} components`} items={pills.map((c) => ({ value: c.id, label: c.name }))} value={sel.id} onChange={onSelect} />
                {connections.length > 4 && <Button variant="ghost" size="sm" onClick={() => setViewAll(true)}>View all</Button>}
              </div>
              <Button icon="plus" onClick={() => onAdd(sel.id)}>{family === 'm365' ? 'Add Component' : 'Add new component'}</Button>
            </div>
            <section className="lf-card tablecard tablecard--flat manage-component-cred">
              <div className="toolbar">
                <h3 className="lf-card__title">Credentials for {sel.name}</h3>
                <div className="row">
                  <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirm(sel)}>Delete</Button>
                  <Button size="sm" icon="edit" onClick={() => onEdit(sel)}>Edit</Button>
                </div>
              </div>
              <div className="tbl-wrap">
                <table className="lf-table lf-table--auto" aria-label={`Servers for ${sel.name}`}>
                  <thead><tr><th>Server</th><th>Connection Status</th><th>Details</th></tr></thead>
                  <tbody>
                    <tr className="manage-component-group"><td colSpan={3}><span className="row"><Img src={FAMILY_LOGO[family]} size={20} />{fl}</span></td></tr>
                    {serverRows(sel).map((r, i) => (
                      <tr key={i} className="lf-row" style={{ cursor: 'default' }}>
                        <td className="td-wrap">{r[0]}</td><td className="td-wrap">{r[1]}</td><td className="td-wrap">{r[2]}</td>
                      </tr>
                    ))}
                    <tr className="manage-component-group"><td>Data Insertion</td><td>NA</td><td>No New Changes Detected</td></tr>
                    <tr className="lf-row" style={{ cursor: 'default' }}>
                      <td className="td-wrap">{sel.database.name}</td><td className="td-wrap">{sel.database.server}</td>
                      <td className="td-wrap">{sel.database.auth === 'sql' ? 'SQL Authentication' : 'Windows Authentication'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <EmptyState compact icon="layers"
            title={cloud ? `There are no active cloud components for “${fl}”` : `There are no active components for “${fl}”`}
            action={<Button icon="plus" onClick={() => onAdd(null)}>Add new component</Button>} />
        )}
      </Modal>

      {viewAll && (
        <Modal open onClose={() => setViewAll(false)} title={`Added Data Source “${fl}”`} icon="list" size="md"
          footer={<><Button onClick={() => setViewAll(false)}>Cancel</Button><Button variant="primary" onClick={() => setViewAll(false)}>Done</Button></>}>
          <ul className="manage-component-all">
            {connections.map((c) => (
              <li key={c.id} aria-current={sel?.id === c.id ? 'true' : undefined}>
                <button type="button" className="manage-component-all__name" onClick={() => { onSelect(c.id); setViewAll(false); }}>
                  <Img src={FAMILY_LOGO[family]} size={20} /><span>{c.name}</span>{sel?.id === c.id && <Icon name="check" size={14} />}
                </button>
                <span className="row">
                  <IconButton icon="edit" label={`Edit ${c.name}`} onClick={() => { setViewAll(false); onEdit(c); }} />
                  <IconButton icon="trash" label={`Delete ${c.name}`} danger onClick={() => setConfirm(c)} />
                </span>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} confirmLabel="Delete"
        title={confirm ? `Are you sure you want to delete the ${cloud ? 'cloud component' : 'component'} “${confirm.name}”?` : ''}
        onConfirm={() => { const c = confirm!; setConfirm(null); onDelete(c); }} />
    </>
  );
}

function serverRows(c: Connection): [string, string, string][] {
  const status = `Connection Successful on : ${c.connectedOn}`;
  if (c.family === 'm365') {
    return M365_APPS.filter((a) => c.apps.includes(a)).map((a) => [`${KIND_LABEL[a]} — ${c.name}`, status, 'N/A']);
  }
  if (c.family === 'exchange') {
    return [[c.name, status, `${scopeText(c.objects.mode, c.objects.items.length, 'All mailboxes')} · ${scopeText(c.operations.mode, c.operations.items.length, 'All operations')}`]];
  }
  if (c.family === 'sharepoint') {
    return [[c.name, status, `${scopeText(c.objects.mode, c.objects.items.length, 'All objects')} · ${scopeText(c.operations.mode, c.operations.items.length, 'All operations')}`]];
  }
  return [[c.fields.server ?? c.name, status, 'NA']];
}

/** True while the component wizard occupies the page (the host hides its own content). */
export const useComponentWizardOpen = () => mcStore.use((s) => s.wizard !== null);
