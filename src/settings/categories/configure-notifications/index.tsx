import { useState } from 'react';
import { EmptyState, Icon, SearchField, Segmented, SetCard } from '../../../ui';
import { HeaderActions } from '../../SettingsFrame';
import { NotifyPanel } from './NotifyPanel';
import { SiemTab } from './Siem';
import { NOTIFY_COMPONENTS, notifyStore } from './store';
import './shared/shared.css';
import './styles.css';

/* SCR-SAD-14 Configure Notifications — Components · SCR-SAD-15 SIEM (tabs are page state). */
export default function ConfigureNotificationsPage() {
  const [tab, setTab] = useState<'components' | 'siem'>('components');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const configs = notifyStore.use((s) => s.configs);

  const switchTab = (t: string) => { setTab(t as 'components' | 'siem'); setOpenId(null); setQ(''); };
  const shown = NOTIFY_COMPONENTS.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const open = NOTIFY_COMPONENTS.find((c) => c.id === openId) ?? null;

  return (
    <>
      <Segmented ariaLabel="Configure Notifications sections" value={tab} onChange={switchTab} className="configure-notifications-tabs"
        items={[{ value: 'components', label: 'Components' }, { value: 'siem', label: 'SIEM' }]} />

      {tab === 'components' ? (
        <>
          <HeaderActions>
            <SearchField value={q} onChange={setQ} placeholder="Search" ariaLabel="Search components" style={{ width: 240 }} />
          </HeaderActions>
          <SetCard title="Components" description="Choose a component to set which health events send an email, how often, from which account and to whom.">
            {shown.length === 0 ? (
              <EmptyState icon="search" title="No results match your search or filters." compact />
            ) : (
              <div className="pick-grid configure-notifications-tiles" role="group" aria-label="Components">
                {shown.map((c) => {
                  const done = !!configs[c.id];
                  return (
                    <button key={c.id} type="button" className="pick" aria-pressed={openId === c.id}
                      aria-label={done ? `${c.name} (configured)` : c.name} onClick={() => setOpenId(c.id)}>
                      <span className="pick__ic" aria-hidden="true"><img src={c.logo} alt="" /></span>
                      <span className="pick__text"><b>{c.name}</b>{done && <span>Configured</span>}</span>
                      {done && <span className="pick__check" aria-hidden="true"><Icon name="check" /></span>}
                    </button>
                  );
                })}
              </div>
            )}
          </SetCard>
          {open && <NotifyPanel key={open.id} component={open} onClose={() => setOpenId(null)} />}
        </>
      ) : (
        <SiemTab />
      )}
    </>
  );
}
