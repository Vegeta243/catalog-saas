/**
 * @deprecated Use lib/credits.ts instead — this file is kept only for
 * backward compatibility and will be removed in a future cleanup.
 */
export { PLAN_FEATURES as PLAN_LIMITS, PLAN_FEATURES, PLAN_TASKS, PLAN_PRICES, hasFeature } from './credits';

import { PLAN_FEATURES } from './credits';

export type PlanName = keyof typeof PLAN_FEATURES;
export type PlanFeature = keyof (typeof PLAN_FEATURES)['free'];

export function getPlanLimit(userPlan: string, feature: string): boolean | number {
  const plan = PLAN_FEATURES[userPlan as PlanName] ?? PLAN_FEATURES.free;
  return (plan as unknown as Record<string, boolean | number>)[feature] ?? false;
}

/**
 * Returns true if the user's plan allows the given feature.
 * For boolean features this is a direct check.
 * For numeric features this always returns true (use getPlanLimit to compare counts).
 */
export function checkPlanLimit(userPlan: string, feature: PlanFeature): boolean {
  const value = getPlanLimit(userPlan, feature);
  if (typeof value === 'boolean') return value;
  return (value as number) > 0;
}

/** Human-readable upgrade message shown when a free user hits a limit. */
export const UPGRADE_MESSAGE =
  "Cette fonctionnalité nécessite un abonnement Starter ou supérieur. " +
  "Passez à la version supérieure pour en profiter.";
