import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, IconButton, SearchField, SetCard, ToneTag, useToast } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { ManageComponents, useComponentWizardOpen } from '../manage-component/ManagePanel';
import { DATA_SOURCES, dsStore } from './store';
import type { DataSourceTile } from './store';
import { Logo } from './parts';

/* SCR-SDS-01 Add Data Source (picker). Active Directory opens its own page (ActiveDirectory.tsx). */
export default function Picker() {
  const nav = useNavigate();
  const toast = useToast();
  const [q, setQ] = useState('');
  const adCount = dsStore.use((s) => s.adDomains.length);
  const fsCount = dsStore.use((s) => s.servers.length);
  const wizardOpen = useComponentWizardOpen();

  const tiles = DATA_SOURCES.filter((t) => t.label.toLowerCase().includes(q.trim().toLowerCase()));
  const count = (t: DataSourceTile) => (t.activeDirectory ? adCount : t.fileServerType === 'list' ? fsCount : 0);
  const open = (t: DataSourceTile) => {
    if (t.activeDirectory) nav('/settings/add-data-source/active-directory', adCount ? undefined : { state: { add: true } });
    else if (t.fileServerType === 'list') nav('/settings/add-data-source/file-server');
    else if (t.fileServerType) nav('/settings/add-data-source/file-server', { state: { add: t.fileServerType } });
    else toast({ variant: 'info', title: t.label, message: `${t.label} isn't part of this prototype yet.` });
  };

  return (
    <>
      {!wizardOpen && (
        <HeaderActions>
          <div className="add-data-source-search">
            <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search data sources" maxLength={200} />
            {q && <IconButton icon="x" label="Clear search" bordered onClick={() => setQ('')} />}
          </div>
        </HeaderActions>
      )}
      {!wizardOpen && (
        <SetCard title="Data source">
          {tiles.length ? (
            <div className="pick-grid add-data-source-tiles">
              {tiles.map((t) => {
                const n = count(t);
                return (
                  <button key={t.id} type="button" className="pick add-data-source-tile" onClick={() => open(t)}>
                    <span className="pick__ic"><Logo src={t.logo} size={26} /></span>
                    <span className="pick__text"><b>{t.label}</b>{n > 0 && <ToneTag tone="good">{n} configured</ToneTag>}</span>
                  </button>
                );
              })}
            </div>
          ) : <EmptyState compact icon="search" title="No results match your search or filters." />}
        </SetCard>
      )}
      <ManageComponents />
    </>
  );
}
