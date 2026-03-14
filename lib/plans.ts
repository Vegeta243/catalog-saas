// ─── Plan limits for EcomPilot Elite ─────────────────────────────────────────
// Used by API routes to enforce features, and by UI components to show upgrade
// prompts when a free user tries to access a paid feature.

export const PLAN_LIMITS = {
  free: {
    stores: 1,
    products: 50,
    ai_tasks_per_month: 30,
    bulk_edit: false,
    advanced_seo: false,
  },
  starter: {
    stores: 1,
    products: 50,
    ai_tasks_per_month: 200,
    bulk_edit: true,
    advanced_seo: true,
  },
  pro: {
    stores: 3,
    products: 500,
    ai_tasks_per_month: 1000,
    bulk_edit: true,
    advanced_seo: true,
  },
  scale: {
    stores: 999,
    products: 999999,
    ai_tasks_per_month: 999999,
    bulk_edit: true,
    advanced_seo: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;
export type PlanFeature = keyof (typeof PLAN_LIMITS)['free'];

/**
 * Returns the value for the given plan + feature, falling back to free plan
 * defaults if the plan is unrecognised.
 *
 * For boolean features (bulk_edit, advanced_seo) returns a boolean.
 * For numeric features (stores, products, ai_tasks_per_month) returns a number.
 */
export function getPlanLimit(userPlan: string, feature: PlanFeature): boolean | number {
  const plan = (userPlan as PlanName) in PLAN_LIMITS ? (userPlan as PlanName) : 'free';
  return PLAN_LIMITS[plan][feature];
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
