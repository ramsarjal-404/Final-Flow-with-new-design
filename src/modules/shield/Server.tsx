/* AI Shield › Server (/shield/server): console, database, retention, directory and licence cards. Owners change the
   plumbing (read only here); admins keep retention and the directory current. */
import { useState } from 'react';
import { Button, Chip, Dropdown, Icon, KeyValues, RadioGroup, SetCard, ToneTag, useToast } from '../../ui';
import { MINUTE, SERVER } from './data';
import { setRetention, shieldStore } from './store';
import { ago, fullDate, ShieldPage } from './parts';
import type { ShieldState } from './types';

const RETENTION_OPTIONS = ['1', '3', '6', '9'].map((m) => ({ value: m, label: `${m} month${m === '1' ? '' : 's'}` }));
const subheading = { font: '600 13.5px/19px var(--font)', color: 'var(--ink)' } as const;

export function Server() {
  const toast = useToast();
  const state = shieldStore.use();
  const [months, setMonths] = useState(String(state.retentionMonths));
  const [after, setAfter] = useState<ShieldState['afterRetention']>(state.afterRetention);
  const [connection, setConnection] = useState<'idle' | 'testing' | 'ok'>('idle');
  const [lastSync, setLastSync] = useState(() => new Date(Date.now() - 23 * MINUTE).toISOString());

  const retentionChanged = Number(months) !== state.retentionMonths || after !== state.afterRetention;
  const seatsUsed = state.endpoints.filter((e) => e.agent !== 'none').length;
  const { licence } = SERVER;

  const testConnection = () => {
    setConnection('testing');
    setTimeout(() => setConnection('ok'), 1100);
  };
  const syncNow = () => {
    const progress = toast({ variant: 'info', title: 'Syncing with Active Directory', message: 'Reading people and endpoints from corp.local…', loading: true });
    setTimeout(() => {
      setLastSync(new Date().toISOString());
      progress.update({
        variant: 'success',
        title: 'Directory synced',
        message: `${state.people.length} people and ${state.endpoints.length} endpoints are current.`,
        loading: false,
      });
    }, 1400);
  };
  const notInPrototype = (what: string) => toast({ variant: 'info', title: what, message: `${what} isn't part of this prototype yet.` });
  const copyConsoleUrl = () => {
    navigator.clipboard?.writeText(SERVER.consoleUrl).catch(() => {});
    toast({ variant: 'success', title: 'Copied', message: 'Console URL copied.' });
  };
  const saveRetention = () => {
    setRetention(Number(months), after);
    toast({
      variant: 'success',
      title: 'Retention saved',
      message: `Records stay live for ${months} month${months === '1' ? '' : 's'}, then ${after === 'archive' ? 'move to the archive share' : 'are deleted'}.`,
    });
  };

  return (
    <ShieldPage
      tab="server"
      title="Server"
      description="Where AI Shield runs, where its records live and where people come from. Owners change the plumbing; admins keep retention and the directory current."
    >
      <div className="shield-srv">
        <SetCard title="Console" description="How the console and the endpoint agents reach this server." actions={<ToneTag tone="good">Running</ToneTag>}>
          <KeyValues
            items={[
              {
                label: 'Console URL',
                value: <span className="shield-inline">{SERVER.consoleUrl}<Button size="sm" icon="copy" onClick={copyConsoleUrl}>Copy</Button></span>,
                wide: true,
              },
              { label: 'Certificate', value: SERVER.certificate, wide: true },
              { label: 'Service', value: SERVER.service },
              { label: 'Version', value: SERVER.version },
              { label: 'Install path', value: SERVER.installPath, wide: true },
            ]}
          />
        </SetCard>

        <SetCard
          title="Where data is stored"
          description="Prompts, decisions and the audit trail. It all stays on your network."
          actions={connection === 'ok'
            ? <span className="shield-ok"><Icon name="check" size={14} />Connected · 12 ms</span>
            : <Button size="sm" icon="refresh" loading={connection === 'testing'} onClick={testConnection}>Test connection</Button>}
        >
          <KeyValues
            items={[
              { label: 'Database', value: SERVER.dbEngine },
              { label: 'Server', value: SERVER.dbHost },
              { label: 'Port', value: SERVER.dbPort },
              { label: 'Database name', value: SERVER.dbName },
            ]}
          />
        </SetCard>

        <SetCard
          title="Where old data goes"
          description="How long records stay live, and what happens to them after."
          footer={
            <div className="row row--end" style={{ gap: 8 }}>
              {retentionChanged && (
                <Button onClick={() => { setMonths(String(state.retentionMonths)); setAfter(state.afterRetention); }}>Discard</Button>
              )}
              <Button variant="primary" disabled={!retentionChanged} onClick={saveRetention}>Save changes</Button>
            </div>
          }
        >
          <div className="stack">
            <div className="row row--between" style={{ gap: 16 }}>
              <div>
                <b style={subheading}>Retention</b>
                <br />
                <span className="lf-muted" style={{ fontSize: 12.5 }}>How long sessions and decisions stay searchable.</span>
              </div>
              <Dropdown size="sm" value={months} ariaLabel="Retention" onChange={setMonths} options={RETENTION_OPTIONS} />
            </div>
            <div>
              <b style={subheading}>After retention</b>
              <RadioGroup
                value={after}
                onChange={(v) => setAfter(v as ShieldState['afterRetention'])}
                options={[
                  { value: 'archive', label: `Archive to ${SERVER.archivePath}` },
                  { value: 'delete', label: 'Delete permanently' },
                ]}
              />
            </div>
          </div>
        </SetCard>

        <SetCard
          title="Where admins and endpoints come from"
          description="The directory this server trusts for people, roles and endpoints."
          actions={<Button size="sm" icon="refresh" onClick={syncNow}>Sync now</Button>}
        >
          <KeyValues
            items={[
              { label: 'Identity source', value: <span className="shield-inline">{SERVER.provider}<Chip tone="good" icon="check">Connected</Chip></span> },
              { label: 'Domain', value: SERVER.tenant },
              { label: 'Service account', value: SERVER.serviceAccount },
              { label: 'Last sync', value: ago(lastSync) },
            ]}
          />
        </SetCard>

        <SetCard
          title="Licence"
          description="Registered on this server by its Owner."
          actions={<Button size="sm" onClick={() => notInPrototype('Activate another licence')}>Activate another licence</Button>}
        >
          <KeyValues
            items={[
              { label: 'Licence', value: <code style={{ font: '600 13px var(--mono)' }}>{licence.id}</code> },
              { label: 'Registered by', value: licence.by },
              { label: 'Activated', value: `${fullDate(licence.at)} · ${licence.method}` },
              // Date only: "Oct 23, 2027".
              { label: 'Expires', value: fullDate(licence.expires).split(',').slice(0, 2).join(',') },
              {
                label: 'Endpoint seats',
                value: (
                  <div>
                    <div className="row row--between" style={{ marginBottom: 6 }}>
                      <span>{seatsUsed} of {licence.seats} in use</span>
                      <span className="lf-muted">{licence.seats - seatsUsed} free</span>
                    </div>
                    <div className="shield-meter"><span style={{ width: `${(seatsUsed / licence.seats) * 100}%` }} /></div>
                  </div>
                ),
                wide: true,
              },
            ]}
          />
        </SetCard>
      </div>
    </ShieldPage>
  );
}
