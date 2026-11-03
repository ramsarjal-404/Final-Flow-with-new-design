import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, SetCard, useToast } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { SearchBox } from './shared';
import { TRUST_SOURCES, plural, trustStore } from './store';

/* SCR-SDS-09 · Configure Scan Settings (Trust picker). */
export function Picker() {
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const sources = trustStore.use((s) => s.sources);
  const shown = TRUST_SOURCES.filter((s) => s.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="trust-root">
      <HeaderActions><SearchBox value={q} onChange={setQ} ariaLabel="Search components" maxLength={100} /></HeaderActions>
      <SetCard title="Configure scan settings" description="Select any component for Current Permission Scan Settings">
        {shown.length === 0 ? (
          <EmptyState compact icon="search" title="No results match your search or filters." />
        ) : (
          <div className="pick-grid trust-grid">
            {shown.map((s) => {
              const n = sources[s.id]?.dataSets.length ?? 0;
              return (
                <button key={s.id} type="button" className="pick trust-tile" aria-label={`Configure ${s.label}`}
                  onClick={() => (s.kind === 'none'
                    ? toast({ variant: 'info', title: s.label, message: `Current permission scan settings for ${s.label} aren't part of this prototype yet.` })
                    : nav(`/settings/trust/${s.id}`))}>
                  <span className="pick__ic trust-tile__ic"><img src={s.logo} alt="" /></span>
                  <span className="pick__text"><b>{s.label}</b></span>
                  {n > 0 && <span className="count-chip trust-tile__n" data-tip={plural(n, 'data set')}>{n}</span>}
                </button>
              );
            })}
          </div>
        )}
      </SetCard>
    </div>
  );
}
