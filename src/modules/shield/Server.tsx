// @ts-nocheck — ported from the live prototype (https://lepide-new-ui.vercel.app/shield); shapes are in ./types.ts.
/* AI Shield › Server (/shield/server): console, database, retention, directory and licence cards. */
import * as React from 'react';
import { ToneTag, Chip, Icon, Button, useToast, RadioGroup, Dropdown, SetCard, KeyValues } from '../../ui';
import { SERVER } from './data';
import { shieldStore, setRetention } from './store';
import { ShieldPage, ago, fullDate } from './parts';

export function Server() {
  const t = useToast(),
    n = shieldStore.use(),
    [o, c] = React.useState(String(n.retentionMonths)),
    [d, u] = React.useState(n.afterRetention),
    f = Number(o) !== n.retentionMonths || d !== n.afterRetention,
    [x, j] = React.useState('idle'),
    [r, v] = React.useState(new Date(Date.now() - 23 * 6e4).toISOString()),
    m = n.endpoints.filter((l) => l.agent !== 'none').length,
    p = () => {
      j('testing'), setTimeout(() => j('ok'), 1100);
    },
    s = () => {
      const l = t({
        variant: 'info',
        title: 'Syncing with Active Directory',
        message: 'Reading people and endpoints from corp.local…',
        loading: !0,
      });
      setTimeout(() => {
        v(new Date().toISOString()),
          l.update({
            variant: 'success',
            title: 'Directory synced',
            message: `${n.people.length} people and ${n.endpoints.length} endpoints are current.`,
            loading: !1,
          });
      }, 1400);
    },
    i = (l) =>
      t({
        variant: 'info',
        title: l,
        message: `${l} isn't part of this prototype yet.`,
      });
  return (
    <ShieldPage
      tab="server"
      title="Server"
      description="Where AI Shield runs, where its records live and where people come from. Owners change the plumbing; admins keep retention and the directory current."
    >
      <div className="shield-srv">
        <SetCard
          title="Console"
          description="How the console and the endpoint agents reach this server."
          actions={<ToneTag tone="good">Running</ToneTag>}
        >
          <KeyValues
            items={[
              {
                label: 'Console URL',
                value: (
                  <span className="shield-inline">
                    {SERVER.consoleUrl}
                    <Button
                      size="sm"
                      icon="copy"
                      onClick={() => {
                        var l;
                        (l = navigator.clipboard) == null || l.writeText(SERVER.consoleUrl).catch(() => {}),
                          t({
                            variant: 'success',
                            title: 'Copied',
                            message: 'Console URL copied.',
                          });
                      }}
                    >
                      Copy
                    </Button>
                  </span>
                ),
                wide: !0,
              },
              {
                label: 'Certificate',
                value: SERVER.certificate,
                wide: !0,
              },
              {
                label: 'Service',
                value: SERVER.service,
              },
              {
                label: 'Version',
                value: SERVER.version,
              },
              {
                label: 'Install path',
                value: SERVER.installPath,
                wide: !0,
              },
            ]}
          />
        </SetCard>
        <SetCard
          title="Where data is stored"
          description="Prompts, decisions and the audit trail. It all stays on your network."
          actions={
            x === 'ok' ? (
              <span className="shield-ok">
                <Icon name="check" size={14} />
                Connected · 12 ms
              </span>
            ) : (
              <Button size="sm" icon="refresh" loading={x === 'testing'} onClick={p}>
                Test connection
              </Button>
            )
          }
        >
          <KeyValues
            items={[
              {
                label: 'Database',
                value: SERVER.dbEngine,
              },
              {
                label: 'Server',
                value: SERVER.dbHost,
              },
              {
                label: 'Port',
                value: SERVER.dbPort,
              },
              {
                label: 'Database name',
                value: SERVER.dbName,
              },
            ]}
          />
        </SetCard>
        <SetCard
          title="Where old data goes"
          description="How long records stay live, and what happens to them after."
          footer={
            <div
              className="row row--end"
              style={{
                gap: 8,
              }}
            >
              {f && (
                <Button
                  onClick={() => {
                    c(String(n.retentionMonths)), u(n.afterRetention);
                  }}
                >
                  Discard
                </Button>
              )}
              <Button
                variant="primary"
                disabled={!f}
                onClick={() => {
                  setRetention(Number(o), d),
                    t({
                      variant: 'success',
                      title: 'Retention saved',
                      message: `Records stay live for ${o} month${o === '1' ? '' : 's'}, then ${d === 'archive' ? 'move to the archive share' : 'are deleted'}.`,
                    });
                }}
              >
                Save changes
              </Button>
            </div>
          }
        >
          <div className="stack">
            <div
              className="row row--between"
              style={{
                gap: 16,
              }}
            >
              <div>
                <b
                  style={{
                    font: '600 13.5px/19px var(--font)',
                    color: 'var(--ink)',
                  }}
                >
                  Retention
                </b>
                <br />
                <span
                  className="lf-muted"
                  style={{
                    fontSize: 12.5,
                  }}
                >
                  How long sessions and decisions stay searchable.
                </span>
              </div>
              <Dropdown
                size="sm"
                value={o}
                ariaLabel="Retention"
                onChange={c}
                options={[
                  {
                    value: '1',
                    label: '1 month',
                  },
                  {
                    value: '3',
                    label: '3 months',
                  },
                  {
                    value: '6',
                    label: '6 months',
                  },
                  {
                    value: '9',
                    label: '9 months',
                  },
                ]}
              />
            </div>
            <div>
              <b
                style={{
                  font: '600 13.5px/19px var(--font)',
                  color: 'var(--ink)',
                }}
              >
                After retention
              </b>
              <RadioGroup
                value={d}
                onChange={(l) => u(l)}
                options={[
                  {
                    value: 'archive',
                    label: `Archive to ${SERVER.archivePath}`,
                  },
                  {
                    value: 'delete',
                    label: 'Delete permanently',
                  },
                ]}
              />
            </div>
          </div>
        </SetCard>
        <SetCard
          title="Where admins and endpoints come from"
          description="The directory this server trusts for people, roles and endpoints."
          actions={
            <Button size="sm" icon="refresh" onClick={s}>
              Sync now
            </Button>
          }
        >
          <KeyValues
            items={[
              {
                label: 'Identity source',
                value: (
                  <span className="shield-inline">
                    {SERVER.provider}
                    <Chip tone="good" icon="check">
                      Connected
                    </Chip>
                  </span>
                ),
              },
              {
                label: 'Domain',
                value: SERVER.tenant,
              },
              {
                label: 'Service account',
                value: SERVER.serviceAccount,
              },
              {
                label: 'Last sync',
                value: ago(r),
              },
            ]}
          />
        </SetCard>
        <SetCard
          title="Licence"
          description="Registered on this server by its Owner."
          actions={
            <Button size="sm" onClick={() => i('Activate another licence')}>
              Activate another licence
            </Button>
          }
        >
          <KeyValues
            items={[
              {
                label: 'Licence',
                value: (
                  <code
                    style={{
                      font: '600 13px var(--mono)',
                    }}
                  >
                    {SERVER.licence.id}
                  </code>
                ),
              },
              {
                label: 'Registered by',
                value: SERVER.licence.by,
              },
              {
                label: 'Activated',
                value: `${fullDate(SERVER.licence.at)} · ${SERVER.licence.method}`,
              },
              {
                label: 'Expires',
                value: fullDate(SERVER.licence.expires).split(',').slice(0, 2).join(','),
              },
              {
                label: 'Endpoint seats',
                value: (
                  <div>
                    <div
                      className="row row--between"
                      style={{
                        marginBottom: 6,
                      }}
                    >
                      <span>
                        {m}
                        {' of '}
                        {SERVER.licence.seats}
                        {' in use'}
                      </span>
                      <span className="lf-muted">
                        {SERVER.licence.seats - m}
                        {' free'}
                      </span>
                    </div>
                    <div className="shield-meter">
                      <span
                        style={{
                          width: `${(m / SERVER.licence.seats) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ),
                wide: !0,
              },
            ]}
          />
        </SetCard>
      </div>
    </ShieldPage>
  );
}
