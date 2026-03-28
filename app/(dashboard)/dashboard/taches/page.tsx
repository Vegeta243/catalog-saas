"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { PLAN_TASKS } from "@/lib/credits";
import {
  Sparkles, Package, DollarSign, ImageIcon, Wand2,
  Clock, CheckCircle2, XCircle, Filter, ChevronDown, Loader2
} from "lucide-react";

interface ActionEntry {
  id: string;
  action_type: string;
  description: string;
  products_count: number;
  credits_used: number;
  details: Record<string, unknown>;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Sparkles; label: string; color: string }> = {
  "ai.generate": { icon: Sparkles, label: "IA", color: "#8b5cf6" },
  "ai.generate.title": { icon: Sparkles, label: "Titre IA", color: "#8b5cf6" },
  "ai.generate.description": { icon: Wand2, label: "Description IA", color: "#6366f1" },
  "ai.generate.batch": { icon: Sparkles, label: "IA Batch", color: "#7c3aed" },
  "image.optimize": { icon: ImageIcon, label: "Image", color: "#3b82f6" },
  "shopify.bulk_update": { icon: Package, label: "Bulk edit", color: "#06b6d4" },
  "shopify.images.push": { icon: ImageIcon, label: "Push images", color: "#10b981" },
  "calendar.suggest": { icon: Clock, label: "Suggestion IA", color: "#ec4899" },
  "account.soft_delete": { icon: XCircle, label: "Suppression", color: "#ef4444" },
  "account.recovered": { icon: CheckCircle2, label: "Récupération", color: "#22c55e" },
};

function getTypeInfo(actionType: string) {
  if (TYPE_CONFIG[actionType]) return TYPE_CONFIG[actionType];
  if (actionType.startsWith("ai.")) return TYPE_CONFIG["ai.generate"];
  if (actionType.startsWith("image.")) return TYPE_CONFIG["image.optimize"];
  if (actionType.startsWith("shopify.")) return TYPE_CONFIG["shopify.bulk_update"];
  return { icon: Clock, label: actionType, color: "var(--text-tertiary)" };
}

type Tab = "all" | "ai" | "image" | "shopify" | "other";

export default function TachesPage() {
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [plan, setPlan] = useState("free");
  const [tasksUsed, setTasksUsed] = useState(0);

  const tasksTotal = PLAN_TASKS[plan] || 50;
  const tasksRemaining = Math.max(0, tasksTotal - tasksUsed);

  useEffect(() => { document.title = "Tâches | EcomPilot"; }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: userData }, { data: historyData }] = await Promise.all([
        supabase.from("users").select("plan, actions_used").eq("id", user.id).single(),
        supabase.from("action_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      ]);

      if (userData) {
        setPlan(userData.plan || "free");
        setTasksUsed(userData.actions_used || 0);
      }
      setActions(historyData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredActions = actions.filter(a => {
    if (tab === "all") return true;
    if (tab === "ai") return a.action_type.startsWith("ai.");
    if (tab === "image") return a.action_type.startsWith("image.") || a.action_type === "shopify.images.push";
    if (tab === "shopify") return a.action_type.startsWith("shopify.") && a.action_type !== "shopify.images.push";
    return !a.action_type.startsWith("ai.") && !a.action_type.startsWith("image.") && !a.action_type.startsWith("shopify.");
  });

  // Stats
  const thisMonth = actions.filter(a => {
    const d = new Date(a.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalCreditsThisMonth = thisMonth.reduce((sum, a) => sum + (a.credits_used || 0), 0);
  const mostFrequent = (() => {
    const counts: Record<string, number> = {};
    thisMonth.forEach(a => { const k = a.action_type.split(".").slice(0, 2).join("."); counts[k] = (counts[k] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? getTypeInfo(sorted[0][0]).label : "—";
  })();

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "ai", label: "IA" },
    { key: "image", label: "Images" },
    { key: "shopify", label: "Shopify" },
    { key: "other", label: "Autres" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes tâches</h1>
        <p className="text-sm text-gray-500 mt-1">Suivi de consommation et historique des actions</p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Utilisation ce mois</span>
          <span className={`text-sm font-bold ${tasksRemaining <= 5 ? "text-red-500" : tasksRemaining <= 20 ? "text-blue-500" : "text-green-600"}`}>
            {tasksUsed} / {tasksTotal} tâches
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all ${tasksRemaining <= 5 ? "bg-red-500" : tasksRemaining <= 20 ? "bg-blue-500" : "bg-blue-500"}`}
            style={{ width: `${Math.min(100, (tasksUsed / tasksTotal) * 100)}%` }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Tâches utilisées ce mois</p>
          <p className="text-xl font-bold text-gray-900">{totalCreditsThisMonth}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Action la plus fréquente</p>
          <p className="text-xl font-bold text-gray-900">{mostFrequent}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Tâches restantes</p>
          <p className={`text-xl font-bold ${tasksRemaining <= 5 ? "text-red-500" : "text-green-600"}`}>{tasksRemaining}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucune action dans cette catégorie</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredActions.map(a => {
              const info = getTypeInfo(a.action_type);
              const IconComp = info.icon;
              return (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: info.color + "15" }}>
                    <IconComp className="w-4 h-4" style={{ color: info.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">{a.description}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-500 flex-shrink-0">{info.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span>{new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      {a.products_count > 1 && <span>{a.products_count} produits</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {a.credits_used > 0 ? (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {a.credits_used} tâche{a.credits_used > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                        Gratuit
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task cost reference */}
      <div className="mt-6 bg-blue-50 rounded-xl border border-blue-100 p-4">
        <h3 className="text-xs font-semibold text-blue-700 uppercase mb-3">Coût par action</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs text-gray-700">Titre IA — <b>1 tâche</b></span>
          </div>
          <div className="flex items-center gap-2">
            <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs text-gray-700">Description IA — <b>3 tâches</b></span>
          </div>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-gray-700">Image — <b>1 tâche</b></span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-xs text-gray-700">Bulk edit — <b>Gratuit</b></span>
          </div>
        </div>
      </div>
    </div>
  );
}
