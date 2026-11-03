import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, ConfirmDialog, DataTable, DetailPanel, EmptyState, IconButton, KeyValues, ProgressBar, useToast,
} from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { IDF_SOURCES, deleteProfile, idfStore, pauseProfile, plural, runProfile } from './store';
import type { IdfSource, Profile } from './store';
import { Console, SearchBox } from './shared';
import { ProfileWizard } from './ProfileWizard';

/* ---------- SCR-SDS-11 · Configure Data Discovery Settings ---------- */
export function SourcePicker() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const profiles = idfStore.use((s) => s.profiles);
  const shown = IDF_SOURCES.filter((s) => s.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <HeaderActions>
        <span className="identify-header-search">
          <SearchBox value={q} onChange={setQ} ariaLabel="Search data sources" maxLength={200} />
        </span>
      </HeaderActions>
      <section className="lf-card set-card">
        <header className="set-card__head">
          <div><h3>Configure Data Discovery Settings</h3><p>Select any component for Data Discovery &amp; Classification</p></div>
        </header>
        <div className="set-card__body">
          {shown.length === 0 ? (
            <EmptyState compact icon="search" title="No results match your search or filters." />
          ) : (
            <div className="pick-grid">
              {shown.map((s) => {
                const n = profiles.filter((p) => p.sourceId === s.id).length;
                return (
                  <button key={s.id} type="button" className="pick identify-tile" aria-label={s.label + (n ? ` — ${plural(n, 'profile')}` : '')}
                    onClick={() => nav(`/settings/identify/${s.id}`)}>
                    <span className="pick__ic"><img src={s.logo} alt="" /></span>
                    <span className="pick__text"><b>{s.label}</b></span>
                    {n > 0 && <span className="count-chip identify-tile__n" data-tip={plural(n, 'profile')} aria-hidden="true">{n}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

/* ---------- SCR-SDS-12 · Data Discovery & Classification - <source> (Profile List) ---------- */
const progressLabel = (p: Profile) => (p.status === 'Running' ? 'Profile in Progress' : p.status === 'Paused' ? 'Profile Paused' : 'Profile Completed');

export function ProfileList({ source }: { source: IdfSource }) {
  const toast = useToast();
  const all = idfStore.use((s) => s.profiles);
  const templates = idfStore.use((s) => s.templates);
  const profiles = all.filter((p) => p.sourceId === source.id);
  const [sel, setSel] = useState<string | null>(null);
  const [wiz, setWiz] = useState<null | { profile: Profile | null }>(null);
  const [del, setDel] = useState<Profile | null>(null);
  const cur = profiles.find((p) => p.id === sel) ?? null;

  if (wiz) return <ProfileWizard source={source} initial={wiz.profile} onClose={() => setWiz(null)} />;

  const toggleRun = (p: Profile) => {
    if (p.status === 'Running') { pauseProfile(p.id); toast({ variant: 'success', title: 'Profile paused', message: `${p.name} has been paused.` }); }
    else { runProfile(p.id); toast({ variant: 'success', title: 'Profile started', message: `${p.name} is classifying again.` }); }
  };

  const table = (
    <DataTable title="Profiles" noun={['profile', 'profiles']} rows={profiles} rowKey={(p) => p.id}
      activeKey={sel} onRowOpen={(p) => setSel(p.id === sel ? null : p.id)}
      columns={[
        { key: 'name', header: 'Profile Name', sortable: true, filterable: true },
        {
          key: 'progress', header: 'Profile Progress', sortable: true, filterable: true, minWidth: 220, value: progressLabel,
          render: (p) => (
            <div className={'identify-progress' + (p.status === 'Paused' ? ' is-paused' : '')}>
              <span>{progressLabel(p)}</span>
              <ProgressBar value={p.progress} label={`${p.name} progress`} />
            </div>
          ),
        },
        { key: 'agentCommunication', header: 'Agent Communication', sortable: true, filterable: true },
        { key: 'onDemand', header: 'On Demand Classification', sortable: true, filterable: true, value: (p) => (p.classifyNow || p.scheduled ? p.status : 'N/A') },
        { key: 'onTheFly', header: 'On the fly Classification', sortable: true, filterable: true, value: (p) => (p.onTheFly ? 'Enabled' : 'N/A') },
        { key: 'lastStart', header: 'Last Scan Start Time', sortable: true, filterable: true },
        { key: 'lastEnd', header: 'Last Scan End Time', sortable: true, filterable: true },
      ]}
      rowActions={(p) => <>
        <IconButton icon={p.status === 'Running' ? 'pause' : 'play'} label={`${p.status === 'Running' ? 'Pause' : 'Run'} ${p.name}`} onClick={() => toggleRun(p)} />
        <IconButton icon="trash" label={`Delete ${p.name}`} className="identify-danger-ic" onClick={() => setDel(p)} />
        <IconButton icon="edit" label={`Edit ${p.name}`} onClick={() => setWiz({ profile: p })} />
      </>}
      empty={<EmptyState icon="file-search" title="No profile detected." message="Please create a profile to proceed with classification" />} />
  );

  return (
    <Console source={source} logo title={`Data Discovery & Classification - ${source.label}`} subtitle="Profile Details" crumbs={[{ label: 'Profile List' }]}
      actions={<Button variant="primary" icon="plus" onClick={() => setWiz({ profile: null })}>Create profile</Button>}>
      <div className={cur ? 'with-detail' : undefined}>
        {table}
        {cur && (
          <DetailPanel title="Template Information" subtitle={cur.name} onClose={() => setSel(null)}>
            {cur.templateIds.length === 0 ? <p className="muted">No templates are attached to this profile.</p> : (
              <KeyValues cols={2} items={cur.templateIds.map((id) => templates.find((t) => t.id === id)).filter(Boolean).map((t) => ({
                label: t!.name, wide: true, value: `${t!.kind} · ${t!.tagIds.length} tag(s) — ${t!.description}`,
              }))} />
            )}
          </DetailPanel>
        )}
      </div>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete profile?" confirmLabel="Delete"
        message={del ? `"${del.name}" and its classification schedule will be removed.` : undefined}
        onConfirm={() => {
          if (!del) return;
          deleteProfile(del.id); if (sel === del.id) setSel(null);
          toast({ variant: 'success', title: 'Profile deleted', message: `${del.name} was deleted.` });
          setDel(null);
        }} />
    </Console>
  );
}
