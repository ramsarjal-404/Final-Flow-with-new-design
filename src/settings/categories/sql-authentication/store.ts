import notify from '../../../data/settings/notify.json';
import { createStore } from '../../../stores/createStore';

/* ENT-SAD-SqlConnectionSettings / MySqlCredentials / DeliveryRow.
   GAP-SAD-02 / GAP-SAD-03 intended: applied settings, delivery rows and the app server persist for
   the session (module-level store). Unsaved form drafts, test state and the tab stay page state. */

export const SQL_SERVERS = notify.exports.SQL_SERVERS as string[];
export const SQL_DATABASES = notify.exports.SQL_DATABASES as string[];
export const APP_SERVER_DEFAULT = notify.exports.APP_SERVER_DEFAULT as string;

export type Auth = 'SQL' | 'Windows';
export type Conn = { server: string; auth: Auth; user: string; password: string; connection: number | ''; query: number | '' };
export type GpSettings = Conn & { dbMode: 'create' | 'select'; newDb: string; db: string };
export type MySqlSettings = { host: string; port: number | ''; user: string };
export type DeliveryKind = 'Email' | 'Mobile App' | 'Execute Script';
export type DeliveryRow = { id: string; name: string; kind: DeliveryKind; details: [string, string][]; accountId?: string; scriptName?: string };

type State = { def: Conn; gp: GpSettings; mysql: MySqlSettings; rows: DeliveryRow[]; appServer: string };

export const sqlStore = createStore<State>({
  // GAP-SAD-15 intended: the saved password is shown masked, never in clear.
  def: { server: 'devl174', auth: 'SQL', user: 'devl174', password: 'devl@174', connection: 60, query: 60 },
  gp: { server: 'INLSD142-DEV-AS', auth: 'SQL', user: 'sa', password: '', connection: 60, query: 60, dbMode: 'select', newDb: '', db: '' },
  mysql: { host: 'localhost', port: 3306, user: 'root' },
  rows: [],
  appServer: APP_SERVER_DEFAULT,
});

export const timeoutOk = (v: number | '') => v !== '' && v >= 1 && v <= 3600;
export const NEW_DB_RE = /^[A-Za-z][A-Za-z0-9_]{1,63}$/;
