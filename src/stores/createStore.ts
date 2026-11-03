import { useSyncExternalStore } from 'react';

/**
 * Module-level store: survives navigation inside the app, resets on reload (the scope the
 * architecture gives most Settings stores). Optional `persist` keeps it in sessionStorage.
 *
 *   const store = createStore({ items: SEED });
 *   const items = store.use((s) => s.items);
 *   store.set((s) => ({ ...s, items: [...s.items, x] }));
 */
export function createStore<S>(initial: S, persist?: { key: string; storage?: 'session' | 'local' }) {
  const storage = () => (persist?.storage === 'local' ? localStorage : sessionStorage);
  let state = initial;
  if (persist) { try { const raw = storage().getItem(persist.key); if (raw) state = JSON.parse(raw) as S; } catch { /* ignore */ } }
  const subs = new Set<() => void>();
  const get = () => state;
  const set = (next: S | ((s: S) => S)) => {
    state = typeof next === 'function' ? (next as (s: S) => S)(state) : next;
    if (persist) { try { storage().setItem(persist.key, JSON.stringify(state)); } catch { /* ignore */ } }
    subs.forEach((f) => f());
  };
  const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
  function use(): S;
  function use<T>(sel: (s: S) => T): T;
  function use<T>(sel?: (s: S) => T) {
    return useSyncExternalStore(subscribe, () => (sel ? sel(state) : state));
  }
  return { get, set, subscribe, use };
}

let seq = 0;
/** Short unique id for records created in the session. */
export const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Rebuild a published `{ "$regexp": source, "flags": … }` pattern. */
export const toRegExp = (p: { $regexp: string; flags?: string } | string) => (typeof p === 'string' ? new RegExp(p) : new RegExp(p.$regexp, p.flags ?? ''));
