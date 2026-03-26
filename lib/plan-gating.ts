/**
 * @deprecated Use lib/credits.ts instead — this file is kept only for
 * backward compatibility and will be removed in a future cleanup.
 */
export { hasFeature } from './credits';

export type PlanTier = 'free' | 'starter' | 'pro' | 'agency' | 'scale';

const PLAN_HIERARCHY: PlanTier[] = ['free', 'starter', 'pro', 'agency'];

export function isUpgrade(currentPlan: PlanTier, targetPlan: PlanTier): boolean {
  return PLAN_HIERARCHY.indexOf(targetPlan) > PLAN_HIERARCHY.indexOf(currentPlan);
}

export function canAccessFeature(userPlan: PlanTier, requiredPlan: PlanTier): boolean {
  return PLAN_HIERARCHY.indexOf(userPlan) >= PLAN_HIERARCHY.indexOf(requiredPlan);
}
