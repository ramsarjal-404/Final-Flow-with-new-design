// @ts-nocheck — ported from the live prototype (https://lepide-new-ui.vercel.app/shield); shapes are in ./types.ts.
/* AI Shield › People (/shield/people): role filter, people table, the "Add person" drawer, the edit drawer (reset password, left the directory) and the remove confirmation. */
import * as React from 'react';
import {
  ToneTag,
  Icon,
  Button,
  Person,
  useToast,
  Segmented,
  SearchField,
  ConfirmDialog,
  Drawer,
  TextField,
  SelectField,
  RadioGroup,
  DataTable,
} from '../../ui';
import { ROLES, SIGN_IN_SOURCES, UNITS } from './data';
import { shieldStore, addPerson, updatePerson, removePerson, markLeftDirectory, resetPassword } from './store';
import { ShieldPage, RoleChip, ago } from './parts';
import { RowMenu } from './RowMenu';

export const STATUS_LABELS = {
  active: 'Active',
  invited: 'Invited',
  left: 'Left the directory',
};
export const isEmail = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t.trim());
export function People() {
  const t = useToast(),
    n = shieldStore.use((l) => l.people),
    [o, c] = React.useState('all'),
    [d, u] = React.useState(''),
    [f, x] = React.useState(!1),
    [j, r] = React.useState(null),
    [v, m] = React.useState(null),
    p = React.useMemo(() => n.filter((l) => o === 'all' || l.role === o), [n, o]),
    s = (l) => (l === 'all' ? n.length : n.filter((a) => a.role === l).length),
    i = [
      {
        key: 'name',
        header: 'Person',
        sortable: !0,
        filterable: !0,
        minWidth: 240,
        render: (l) => (
          <span className="row">
            <Person name={l.name} sub={l.email} />
            {l.you && <span className="shield-you">You</span>}
          </span>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        value: (l) => ROLES[l.role].label,
        sortable: !0,
        filterable: !0,
        width: 130,
        render: (l) => <RoleChip role={l.role} />,
      },
      {
        key: 'unit',
        header: 'Unit',
        value: (l) => l.unit ?? '',
        sortable: !0,
        filterable: !0,
        width: 130,
        render: (l) => l.unit ?? <span className="lf-na">—</span>,
      },
      {
        key: 'source',
        header: 'Signs in with',
        value: (l) => SIGN_IN_SOURCES[l.source],
        sortable: !0,
        filterable: !0,
        width: 190,
      },
      {
        key: 'status',
        header: 'Status',
        value: (l) => STATUS_LABELS[l.status],
        sortable: !0,
        width: 160,
        render: (l) => (
          <ToneTag tone={l.status === 'active' ? 'good' : l.status === 'invited' ? 'warn' : 'bad'}>
            {STATUS_LABELS[l.status]}
          </ToneTag>
        ),
      },
      {
        key: 'lastActive',
        header: 'Last active',
        value: (l) => (l.lastActive ? new Date(l.lastActive).getTime() : 0),
        sortable: !0,
        width: 150,
        render: (l) => ago(l.lastActive),
      },
    ];
  return (
    <ShieldPage
      tab="people"
      title="People"
      fill={!0}
      description="Everyone this server knows about: the owners and admins who run it, the approvers who decide requests, and the people whose AI use it protects."
      actions={
        <Button variant="primary" icon="user_plus" onClick={() => x(!0)}>
          Add person
        </Button>
      }
    >
      <div className="stack">
        <Segmented
          ariaLabel="Role"
          hug={!0}
          value={o}
          onChange={(l) => c(l)}
          items={[
            {
              value: 'all',
              label: 'Everyone',
              count: s('all'),
            },
            {
              value: 'admin',
              label: 'Admins',
              count: s('admin'),
            },
            {
              value: 'approver',
              label: 'Approvers',
              count: s('approver'),
            },
            {
              value: 'user',
              label: 'People',
              count: s('user'),
            },
          ]}
        />
        <DataTable
          columns={i}
          rows={p}
          rowKey={(l) => l.id}
          title="People"
          noun={['person', 'people']}
          search={d}
          defaultPageSize={25}
          toolbar={<SearchField value={d} onChange={u} placeholder="Search people…" />}
          isRowDisabled={(l) => l.status === 'left'}
          rowActions={(l) => (
            <RowMenu
              label={`Manage ${l.name}`}
              items={[
                {
                  label: 'Edit',
                  icon: 'edit',
                  onSelect: () => r(l),
                  disabled: l.role === 'owner',
                  reason: l.role === 'owner' ? 'Owners are managed by an Owner' : void 0,
                },
                {
                  label: 'Remove',
                  icon: 'trash',
                  onSelect: () => m(l),
                  disabled: l.role === 'owner' || !!l.you,
                  reason:
                    l.role === 'owner'
                      ? 'Owners are managed by an Owner'
                      : l.you
                        ? "You can't remove yourself"
                        : void 0,
                },
              ]}
            />
          )}
        />
      </div>
      <AddPersonDrawer
        open={f}
        onClose={() => x(!1)}
        onAdded={(l) => {
          x(!1),
            t({
              variant: 'success',
              title: `${l.name} added`,
              message:
                l.status === 'invited'
                  ? `${ROLES[l.role].label} · signs in through ${SIGN_IN_SOURCES[l.source]}. Access opens at their first sign-in.`
                  : `${ROLES[l.role].label} · local account.`,
            });
        }}
      />
      {j && <EditPersonDrawer person={j} onClose={() => r(null)} />}
      <ConfirmDialog
        open={!!v}
        onClose={() => m(null)}
        confirmLabel={v ? `Remove ${v.name.split(' ')[0]}` : 'Remove'}
        title={v ? `Remove ${v.name}?` : ''}
        message={
          (v == null ? void 0 : v.role) === 'approver'
            ? 'They can no longer decide requests. Blocked people will wait until another approver is appointed.'
            : 'They lose access to the console. Their history stays in the audit trail.'
        }
        onConfirm={() => {
          v &&
            (removePerson(v.id),
            t({
              variant: 'success',
              title: 'Person removed',
              message: `${v.name} no longer has access.`,
            })),
            m(null);
        }}
      />
    </ShieldPage>
  );
}
export function AddPersonDrawer({ open: t, onClose: n, onAdded: o }) {
  const [c, d] = React.useState(''),
    [u, f] = React.useState(''),
    [x, j] = React.useState('user'),
    [r, v] = React.useState('ad'),
    [m, p] = React.useState(''),
    [s, i] = React.useState(!1),
    l = () => {
      d(''), f(''), j('user'), v('ad'), p(''), i(!1);
    },
    a = {
      name: c.trim() ? null : 'Enter their full name.',
      email: isEmail(u) ? null : 'Enter a valid work email.',
    },
    h = () => {
      if ((i(!0), a.name || a.email)) return;
      const S = addPerson({
        name: c.trim(),
        email: u.trim().toLowerCase(),
        role: x,
        source: r,
        unit: m || void 0,
      });
      l(), o(S);
    };
  return (
    <Drawer
      open={t}
      onClose={() => {
        l(), n();
      }}
      title="Add person"
      subtitle="Give them a role, and say where their account lives."
      width={520}
      footer={
        <>
          <Button
            onClick={() => {
              l(), n();
            }}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={h}>
            Add person
          </Button>
        </>
      }
    >
      <div className="page-form stack">
        <TextField label="Full name" value={c} onChange={d} error={s ? a.name : null} autoFocus={!0} />
        <TextField
          label="Email"
          type="email"
          placeholder="name@company.com"
          value={u}
          onChange={f}
          error={s ? a.email : null}
        />
        <SelectField
          label="Role"
          value={x}
          onChange={(S) => j(S)}
          help={ROLES[x].blurb}
          options={[
            {
              value: 'user',
              label: 'User',
            },
            {
              value: 'approver',
              label: 'Approver',
            },
            {
              value: 'admin',
              label: 'Admin',
            },
          ]}
        />
        <div className="fld">
          <span className="fld__lbl">Signs in with</span>
          <RadioGroup
            value={r}
            onChange={(S) => v(S)}
            options={[
              {
                value: 'ad',
                label: 'Active Directory',
              },
              {
                value: 'entra',
                label: 'Microsoft Entra ID',
              },
              {
                value: 'local',
                label: 'Local account',
              },
            ]}
          />
          <small className="help">
            {r === 'local'
              ? 'This server holds the password. You will get a one-time password to pass on.'
              : `Their password lives in ${SIGN_IN_SOURCES[r]}; this server never holds it.`}
          </small>
        </div>
        <SelectField label="Unit" note="optional" placeholder="Select" value={m} onChange={p} options={UNITS} />
        <p
          className="lf-muted"
          style={{
            margin: 0,
            fontSize: 12.5,
          }}
        >
          Owners are appointed by an Owner, not from here.
        </p>
      </div>
    </Drawer>
  );
}
export function EditPersonDrawer({ person: t, onClose: n }) {
  const o = useToast(),
    [c, d] = React.useState(t.name),
    [u, f] = React.useState(t.email),
    [x, j] = React.useState(t.role),
    [r, v] = React.useState(t.unit ?? ''),
    [m, p] = React.useState(null),
    [s, i] = React.useState(!1),
    l = t.source === 'local',
    a = () => {
      if (!c.trim() || !isEmail(u)) {
        o({
          variant: 'error',
          title: 'Check the details',
          message: 'A full name and a valid email are needed.',
        });
        return;
      }
      updatePerson(t.id, {
        name: c.trim(),
        email: u.trim().toLowerCase(),
        role: x,
        unit: r || void 0,
      }),
        o({
          variant: 'success',
          title: 'Saved',
          message: `${c.trim()} is up to date.`,
        }),
        n();
    },
    h = async () => {
      try {
        await navigator.clipboard.writeText(m ?? ''), i(!0), setTimeout(() => i(!1), 1500);
      } catch {}
    };
  return (
    <Drawer
      open={!0}
      onClose={n}
      title={t.name}
      subtitle="Change their details, or help them back in if they can't sign in."
      width={520}
      footer={
        <>
          <Button onClick={n}>Cancel</Button>
          <Button variant="primary" onClick={a}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="page-form stack">
        <TextField label="Full name" value={c} onChange={d} autoFocus={!0} />
        <TextField label="Email" type="email" value={u} onChange={f} />
        <SelectField
          label="Role"
          value={x}
          onChange={(S) => j(S)}
          help={ROLES[x].blurb}
          disabled={!!t.you}
          options={[
            {
              value: 'user',
              label: 'User',
            },
            {
              value: 'approver',
              label: 'Approver',
            },
            {
              value: 'admin',
              label: 'Admin',
            },
          ]}
        />
        <SelectField label="Unit" note="optional" placeholder="Select" value={r} onChange={v} options={UNITS} />
        <div className="fld">
          <span className="fld__lbl">Signs in with</span>
          <p
            style={{
              margin: 0,
              font: '500 14px/20px var(--font)',
            }}
          >
            {SIGN_IN_SOURCES[t.source]}
          </p>
          <small className="help">Comes from their account, set when they were added. Not editable here.</small>
        </div>
        <section>
          <p className="shield-section">Getting back in</p>
          {l ? (
            <>
              <div className="shield-access">
                <div className="shield-access__copy">
                  <b>Reset their password</b>
                  <small>
                    You get a one-time password to pass on. They choose their own the moment they sign in with it.
                  </small>
                </div>
                <Button icon="key" onClick={() => p(resetPassword(t.id))}>
                  Reset password
                </Button>
              </div>
              {m && (
                <div className="shield-otp">
                  <div>
                    <small className="lf-muted">One-time password · shown once</small>
                    <br />
                    <code>{m}</code>
                  </div>
                  <Button size="sm" icon={s ? 'check' : 'copy'} onClick={h}>
                    {s ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <p
                className="lf-muted"
                style={{
                  margin: '0 0 8px',
                  fontSize: 13,
                }}
              >
                <b
                  style={{
                    color: 'var(--ink)',
                  }}
                >
                  {t.name.split(' ')[0]}
                  {' signs in through '}
                  {SIGN_IN_SOURCES[t.source]}.
                </b>
                {" Their password lives there, so it's reset there too. This server never holds it."}
              </p>
              {t.status !== 'left' && !t.you && (
                <div className="shield-access">
                  <div className="shield-access__copy">
                    <b>Simulate: they leave the organisation</b>
                    <small>
                      Plays what the directory sync does by itself: sign-in closes, their history stays, and if they
                      held a role the Overview raises it.
                    </small>
                  </div>
                  <Button
                    onClick={() => {
                      markLeftDirectory(t.id),
                        o({
                          variant: 'info',
                          title: 'Removed from directory',
                          message: `${t.name} can no longer sign in. History kept.`,
                        }),
                        n();
                    }}
                  >
                    Left the directory
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
        {t.status === 'left' && (
          <p
            className="lf-muted"
            style={{
              margin: 0,
            }}
          >
            <Icon name="info" size={13} />
            {' This account has left the directory. Sign-in is closed; history is kept.'}
          </p>
        )}
      </div>
    </Drawer>
  );
}
