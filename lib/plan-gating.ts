// Plan gating — restricts features based on user plan

export type PlanTier = "free" | "starter" | "pro" | "scale";

const PLAN_HIERARCHY: PlanTier[] = ["free", "starter", "pro", "scale"];

export interface PlanFeatures {
  maxProducts: number;
  maxShops: number;
  aiModels: string[];
  bulkEdit: boolean;
  automation: boolean;
  imageEditing: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
  customExport: boolean;
  batchAI: boolean;
}

const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    maxProducts: 50,
    maxShops: 1,
    aiModels: ["gpt-4o-mini"],
    bulkEdit: false,
    automation: false,
    imageEditing: false,
    prioritySupport: false,
    apiAccess: false,
    customExport: false,
    batchAI: false,
  },
  starter: {
    maxProducts: 500,
    maxShops: 2,
    aiModels: ["gpt-4o-mini"],
    bulkEdit: true,
    automation: false,
    imageEditing: false,
    prioritySupport: false,
    apiAccess: false,
    customExport: true,
    batchAI: false,
  },
  pro: {
    maxProducts: 2000,
    maxShops: 5,
    aiModels: ["gpt-4o-mini", "gpt-4o"],
    bulkEdit: true,
    automation: true,
    imageEditing: true,
    prioritySupport: true,
    apiAccess: false,
    customExport: true,
    batchAI: true,
  },
  scale: {
    maxProducts: 10000,
    maxShops: 20,
    aiModels: ["gpt-4o-mini", "gpt-4o"],
    bulkEdit: true,
    automation: true,
    imageEditing: true,
    prioritySupport: true,
    apiAccess: true,
    customExport: true,
    batchAI: true,
  },
};

export function getPlanFeatures(plan: PlanTier): PlanFeatures {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.free;
}

export function hasFeature(plan: PlanTier, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan);
  const value = features[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return Array.isArray(value) && value.length > 0;
}

export function isUpgrade(currentPlan: PlanTier, targetPlan: PlanTier): boolean {
  return PLAN_HIERARCHY.indexOf(targetPlan) > PLAN_HIERARCHY.indexOf(currentPlan);
}

export function canAccessFeature(userPlan: PlanTier, requiredPlan: PlanTier): boolean {
  return PLAN_HIERARCHY.indexOf(userPlan) >= PLAN_HIERARCHY.indexOf(requiredPlan);
}

export function getRequiredPlan(feature: keyof PlanFeatures): PlanTier {
  for (const plan of PLAN_HIERARCHY) {
    if (hasFeature(plan, feature)) return plan;
  }
  return "scale";
}
