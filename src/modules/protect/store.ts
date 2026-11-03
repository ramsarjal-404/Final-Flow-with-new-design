/* ENT-PRO-ProtectStore: session-scoped (survives navigation across modules, reset on reload). */
import { createStore } from '../../stores/createStore';
import {
  NOTIFICATIONS, SEED_PERM, SEED_POLICIES, TEAM_ROOT, nextRun, permStamp, stamp,
  type Cfg, type Notif, type PermPolicy, type Person, type Policy,
} from './data';

const savedExcluded = (() => { const out: string[] = []; const walk = (p: Person) => { if (p.excluded) out.push(p.id); p.children?.forEach(walk); }; walk(TEAM_ROOT); return out; })();

type State = {
  policies: Policy[];
  perm: PermPolicy[];
  notifs: Notif[];
  /** Team Management saved sets (GAP-PRO-06 intended: kept for the session). */
  team: { excluded: string[]; enrolled: string[] };
  /** AD Cleaner creator draft (create mode only). */
  draft: { cfg: Cfg; step: number; highest: number } | null;
};

export const protectStore = createStore<State>({
  // GAP-PRO-11: the two seed rows with module "permission" belong to no list, so they are not loaded.
  policies: SEED_POLICIES.filter((p) => p.module !== 'permission').map((p) => ({ ...p })),
  perm: SEED_PERM.map((p) => ({ ...p })),
  notifs: NOTIFICATIONS.map((n) => ({ ...n })),
  team: { excluded: savedExcluded, enrolled: [] },
  draft: null,
});
const set = protectStore.set;

export function savePolicy(p: Policy): string {
  const id = p.id && protectStore.get().policies.some((x) => x.id === p.id) ? p.id : `pol-${Date.now()}`;
  set((s) => s.policies.some((x) => x.id === id)
    ? { ...s, policies: s.policies.map((x) => (x.id === id ? { ...x, ...p, id } : x)) }
    : { ...s, policies: [{ ...p, id }, ...s.policies] });
  return id;
}
export function setActive(id: string, on: boolean) {
  set((s) => ({ ...s, policies: s.policies.map((p) => p.id !== id ? p : on
    ? { ...p, active: true, status: 'scheduled', scheduled: nextRun(p.time ?? '13:30'), updated: stamp() }
    : { ...p, active: false, status: 'draft', scheduled: 'Not scheduled', updated: stamp() }) }));
}
export const removePolicy = (id: string) => set((s) => ({ ...s, policies: s.policies.filter((p) => p.id !== id) }));

export function savePerm(p: PermPolicy): string {
  const id = p.id && protectStore.get().perm.some((x) => x.id === p.id) ? p.id : `perm-${Date.now()}`;
  set((s) => s.perm.some((x) => x.id === id)
    ? { ...s, perm: s.perm.map((x) => (x.id === id ? { ...x, ...p, id, status: x.status, active: x.active, isDefault: x.isDefault } : x)) }
    : { ...s, perm: [{ ...p, id }, ...s.perm] });
  return id;
}
export const updatePerm = (id: string, patch: Partial<PermPolicy>) => set((s) => ({ ...s, perm: s.perm.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
export const stampPerm = (id: string, patch: Partial<PermPolicy>) => updatePerm(id, { ...patch, updated: permStamp() });
export const removePerm = (id: string) => set((s) => ({ ...s, perm: s.perm.filter((p) => p.id !== id) }));
export const setDefaultPerm = (id: string) => set((s) => ({ ...s, perm: s.perm.map((p) => ({ ...p, isDefault: p.id === id })) }));

export const toggleNotif = (id: number, unread?: boolean) => set((s) => ({ ...s, notifs: s.notifs.map((n) => (n.id === id ? { ...n, unread: unread ?? !n.unread } : n)) }));
export const markAllRead = () => set((s) => ({ ...s, notifs: s.notifs.map((n) => ({ ...n, unread: false })) }));

export const saveTeam = (excluded: string[], enrolled: string[]) => set((s) => ({ ...s, team: { excluded, enrolled } }));
export const setDraft = (draft: State['draft']) => set((s) => ({ ...s, draft }));
