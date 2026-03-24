// Système de tâches — suivi d'utilisation par utilisateur
// Tâches mensuelles par plan (serveur uniquement)

export const PLAN_TASKS: Record<string, number> = {
  free: 30,
  starter: 1000,
  pro: 20000,
  scale: 100000,
};

export const PLAN_FEATURES = {
  free: {
    tasks: 30,
    shops: 1,
    products: 50,
    ai_titles: true,
    ai_descriptions: true,
    bulk_edit: true,
    image_editor: true,
    import_aliexpress: false,
    automations: false,
    calendar: true,
    competitor_analysis: false,
    api_access: false,
    webhooks: false,
    advanced_automations: false,
  },
  starter: {
    tasks: 1000,
    shops: 1,
    products: 500,
    ai_titles: true,
    ai_descriptions: true,
    bulk_edit: true,
    image_editor: true,
    import_aliexpress: true,
    automations: true,
    calendar: true,
    competitor_analysis: false,
    api_access: false,
    webhooks: false,
    advanced_automations: false,
  },
  pro: {
    tasks: 20000,
    shops: 3,
    products: -1,
    ai_titles: true,
    ai_descriptions: true,
    bulk_edit: true,
    image_editor: true,
    import_aliexpress: true,
    automations: true,
    calendar: true,
    competitor_analysis: true,
    api_access: false,
    webhooks: true,
    advanced_automations: true,
  },
  scale: {
    tasks: 100000,
    shops: -1,
    products: -1,
    ai_titles: true,
    ai_descriptions: true,
    bulk_edit: true,
    image_editor: true,
    import_aliexpress: true,
    automations: true,
    calendar: true,
    competitor_analysis: true,
    api_access: true,
    webhooks: true,
    advanced_automations: true,
  },
} as const;

export type PlanFeature = keyof typeof PLAN_FEATURES['free'];

export function hasFeature(plan: string, feature: PlanFeature): boolean {
  const planFeatures = PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES];
  if (!planFeatures) return false;
  const value = planFeatures[feature];
  return value === true;
}



export const PLAN_PRICES: Record<string, string> = {
  starter: "19€",
  pro: "49€",
  scale: "129€",
};

// Coût en tâches par action (invisible pour l'utilisateur)
export const ACTION_COSTS: Record<string, number> = {
  "ai.generate.title": 1,
  "ai.generate.description": 3,
  "ai.generate.full": 3,
  "ai.generate.tags": 1,
  "ai.generate.meta_description": 1,
  "ai.generate.batch": 2,       // par produit dans le lot
  "import.product": 2,
  "image.optimize": 1,
  "seo.score": 0,
  "bulk.edit": 0,
  "shopify.bulk_edit": 0,
  "shopify.product.update": 0,
};

export function getTaskCost(action: string): number {
  return ACTION_COSTS[action] ?? 1;
}

// Backward compatibility alias
export function getCreditCost(action: string): number {
  return getTaskCost(action);
}

export function canAffordTask(tasksUsed: number, tasksTotal: number, action: string): boolean {
  return (tasksTotal - tasksUsed) >= getTaskCost(action);
}

export function getRemainingTasks(used: number, plan: string): number {
  const limit = PLAN_TASKS[plan] || PLAN_TASKS.starter;
  return Math.max(0, limit - used);
}

export function getTasksColor(remaining: number): string {
  if (remaining > 20) return "#059669"; // vert
  if (remaining > 5) return "#d97706";  // orange
  return "#dc2626";                      // rouge
}

export function getResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}
