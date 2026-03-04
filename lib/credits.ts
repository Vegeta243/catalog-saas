// Credits system — tracks API usage per user
// Plan limits: Free=100, Starter=500, Pro=2000, Scale=10000 credits/month

export const PLAN_CREDITS: Record<string, number> = {
  free: 100,
  starter: 500,
  pro: 2000,
  scale: 10000,
};

export const ACTION_COSTS: Record<string, number> = {
  "ai.generate.title": 1,
  "ai.generate.description": 2,
  "ai.generate.seo": 3,
  "ai.generate.tags": 1,
  "ai.generate.batch": 5,
  "shopify.import": 0,        // free
  "shopify.bulk_edit": 0,     // free
  "shopify.product.update": 0, // free
  "scrape.product": 1,
  "image.edit": 3,
};

export function getCreditCost(action: string): number {
  return ACTION_COSTS[action] ?? 1;
}

export function canAfford(currentCredits: number, action: string): boolean {
  return currentCredits >= getCreditCost(action);
}

export function getRemainingCredits(used: number, plan: string): number {
  const limit = PLAN_CREDITS[plan] || PLAN_CREDITS.free;
  return Math.max(0, limit - used);
}

export function getUsagePercentage(used: number, plan: string): number {
  const limit = PLAN_CREDITS[plan] || PLAN_CREDITS.free;
  return Math.min(100, (used / limit) * 100);
}
