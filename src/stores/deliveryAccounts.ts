import detect from '../data/detect.json';
import { createStore, uid } from './createStore';

/* ENT-SHARED-DeliveryAccount: owned by Detect, read and written by Settings (Subscription,
   Configure Notifications). App-wide, survives navigation, resets on reload. */
export type DeliveryAccount = { id: string; name: string; type: 'Email' | 'App' | 'SIEM'; details: string };

type State = { accounts: DeliveryAccount[]; scriptAccounts: string[]; agents: string[] };
export const deliveryStore = createStore<State>({
  accounts: detect.exports.SEED_ACCOUNTS as DeliveryAccount[],
  scriptAccounts: [...detect.exports.SEED_SCRIPT_ACCOUNTS],
  agents: [...detect.exports.SEED_AGENTS],
});

export const addDeliveryAccount = (a: Omit<DeliveryAccount, 'id'>) => {
  const rec = { ...a, id: uid('acc') };
  deliveryStore.set((s) => ({ ...s, accounts: [...s.accounts, rec] }));
  return rec;
};
export const updateDeliveryAccount = (id: string, patch: Partial<DeliveryAccount>) =>
  deliveryStore.set((s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
export const removeDeliveryAccount = (id: string) => deliveryStore.set((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));

/* Added by the Detect module (ENT-DET-ScriptAccount / ENT-DET-AgentServer): plain strings, no duplicates. */
export const addScriptAccountName = (name: string) =>
  deliveryStore.set((s) => (s.scriptAccounts.includes(name) ? s : { ...s, scriptAccounts: [...s.scriptAccounts, name] }));
export const addAgentServer = (ip: string) =>
  deliveryStore.set((s) => (s.agents.includes(ip) ? s : { ...s, agents: [...s.agents, ip] }));
