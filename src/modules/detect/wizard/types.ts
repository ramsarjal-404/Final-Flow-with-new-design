import type { AlertType, DeliveryAction, FilterRule, Product, Threshold, ValueFilter } from '../model';

/** The wizard's working copy of one ENT-DET-ThreatAlert. */
export type Draft = {
  name: string; description: string; enabled: boolean;
  reports: string[]; product: Product;
  filters: Record<string, FilterRule[]>; valueFilter: ValueFilter; threshold: Threshold;
  actions: DeliveryAction[]; processRemotely: boolean; agent: string; alertType: AlertType;
};

export type RuleState = 'blank' | 'complete' | 'partial';
export const ruleState = (r: FilterRule): RuleState => {
  const n = [r.field !== '', r.operator !== '', r.value.trim() !== ''].filter(Boolean).length;
  return n === 0 ? 'blank' : n === 3 ? 'complete' : 'partial';
};
