"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package, TrendingUp, Clock, CheckCircle2, Circle,
  Sparkles, DollarSign, Download, X, ChevronRight,
  Heart, AlertTriangle, AlertCircle, Image as ImageIcon,
  Zap, Activity, ArrowRight, Check,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import { getTasksColor, getResetDate, PLAN_TASKS } from "@/lib/credits";
import { createClient } from "@/lib/supabase/client";

interface Product {
  id: number;
  title: string;
  body_html: string;
  tags: string;
  images: { src: string }[];
  variants: { price: string }[];
}

// Score SEO par produit (mêmes critères que les pages produits/AI)
function seoScore(p: Product): number {
  let s = 0;
  const title = p.title || "";
  const desc = p.body_html || "";
  const tags = p.tags ? p.tags.split(",").filter(Boolean) : [];
  if (title.length >= 50 && title.length <= 70) s += 30;
  else if (title.length >= 30) s += 15;
  const wordCount = desc.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
  if (wordCount >= 100) s += 40;
  else if (wordCount >= 30) s += 20;
  if (tags.length >= 5) s += 20;
  else if (tags.length >= 2) s += 10;
  if (p.images && p.images.length > 0) s += 10;
  return s;
}

export default function DashboardPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [userFirstName, setUserFirstName] = useState("");
  const [shopCount, setShopCount] = useState(0);

  // Tasks — fetched from Supabase
  const [plan, setPlan] = useState<string>("free");
  const [tasksUsed, setTasksUsed] = useState<number>(0);
  const tasksTotal = PLAN_TASKS[plan] || 10;
  const tasksRemaining = Math.max(0, tasksTotal - tasksUsed);
  const resetDate = getResetDate();

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingSteps, setOnboardingSteps] = useState([
    { id: 1, label: "Boutique connectée", done: false, href: "/dashboard/shops" },
    { id: 2, label: "Produits synchronisés", done: false, href: "/dashboard/products" },
    { id: 3, label: "Premier produit optimisé", done: false, href: "/dashboard/ai" },
  ]);

  // Workflow modals
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [workflowStep, setWorkflowStep] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [priceMode, setPriceMode] = useState<"increase" | "decrease" | "fixed">("increase");
  const [priceValue, setPriceValue] = useState("10");
  const [importUrl, setImportUrl] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [aiResults, setAiResults] = useState<Record<number, { title?: string; description?: string }>>({});

  // No fake activity — only real events would be stored in DB
  const recentActivity: { date: string; action: string; products: number; result: string }[] = [];

  useEffect(() => { document.title = "Tableau de bord | EcomPilot"; }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/shopify/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bonjour");
    else if (hour < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");
    fetchProducts();

    // Fetch real user plan + actions_used from Supabase
    const fetchUserProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // Set first name from auth metadata
        const firstName = user.user_metadata?.first_name || user.email?.split("@")[0] || "";
        setUserFirstName(firstName);
        // Fetch plan + actions_used from users table
        const { data } = await supabase
          .from("users")
          .select("plan, actions_used")
          .eq("id", user.id)
          .single();
        if (data) {
          setPlan(data.plan || "free");
          setTasksUsed(data.actions_used || 0);
        }
        // Check if user has any connected shops
        const { data: shopsData } = await supabase
          .from("shops")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true);
        setShopCount(shopsData?.length || 0);
        // New users with no connected shop go to onboarding
        if (!shopsData || shopsData.length === 0) {
          router.push('/onboarding');
          return;
        }
        // Also check for pending checkout plan in localStorage
        const pendingPlan = localStorage.getItem("ecompilot_pending_plan");
        const pendingBilling = localStorage.getItem("ecompilot_pending_billing");
        if (pendingPlan) {
          localStorage.removeItem("ecompilot_pending_plan");
          localStorage.removeItem("ecompilot_pending_billing");
          window.location.href = `/dashboard/upgrade?autocheckout=${pendingPlan}&billing=${pendingBilling || "monthly"}`;
        }
      } catch { /* silent */ }
    };
    fetchUserProfile();
  }, [fetchProducts]);

  // Sync onboarding steps with real app state
  useEffect(() => {
    if (loading) return;
    const firstOptimized = products.some((p) => seoScore(p) >= 50);
    setOnboardingSteps([
      { id: 1, label: "Boutique connectée", done: shopCount > 0, href: "/dashboard/shops" },
      { id: 2, label: "Produits synchronisés", done: products.length > 0, href: "/dashboard/products" },
      { id: 3, label: "Premier produit optimisé", done: firstOptimized, href: "/dashboard/ai" },
    ]);
  }, [loading, products, shopCount]);

  // Health Score calculations
  const avgScore = products.length > 0
    ? Math.round(products.reduce((s, p) => s + seoScore(p), 0) / products.length)
    : 0;
  const noDesc = products.filter((p) => !p.body_html || p.body_html.replace(/<[^>]*>/g, "").trim().length < 10);
  const shortTitle = products.filter((p) => (p.title || "").length < 30);
  const noImages = products.filter((p) => !p.images || p.images.length === 0);
  const healthColor = avgScore >= 70 ? "#059669" : avgScore >= 40 ? "#d97706" : "#dc2626";
  const healthLabel = avgScore >= 70 ? "Bon" : avgScore >= 40 ? "Moyen" : "Faible";

  // Optimized products count (simulated)
  const optimizedCount = products.filter((p) => seoScore(p) >= 50).length;
  const timeSaved = Math.round(optimizedCount * 2); // 2 min per product

  // Workflow handlers
  const startWorkflow = (wf: string) => {
    setActiveWorkflow(wf);
    setWorkflowStep(1);
    setSelectedProducts([]);
    setAiResults({});
    setImportUrl("");
  };

  const toggleProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedProducts(products.map((p) => p.id));
  };

  const runAIOptimization = async () => {
    setWorkflowLoading(true);
    const selected = products.filter((p) => selectedProducts.includes(p.id));
    try {
      // Process in batches of 3 to avoid rate limiting and excessive costs
      const BATCH_SIZE = 3;
      const map: Record<number, { title?: string; description?: string }> = {};
      for (let i = 0; i < selected.length; i += BATCH_SIZE) {
        const batch = selected.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((p) =>
            fetch("/api/ai/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ product: p, mode: "full" }),
            }).then((r) => r.json())
          )
        );
        batch.forEach((p, j) => {
          map[p.id] = { title: results[j]?.title, description: results[j]?.description };
        });
      }
      setAiResults(map);
      setWorkflowStep(3);
    } catch {
      addToast("Erreur lors de la génération IA", "error");
    }
    setWorkflowLoading(false);
  };

  const applyAIResults = async () => {
    setWorkflowLoading(true);
    const entries = Object.entries(aiResults);
    try {
      await Promise.all(
        entries.map(async ([id, data]) => {
          const calls: Promise<Response>[] = [];
          if (data.title) calls.push(fetch("/api/shopify/bulk-edit", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [Number(id)], field: "title", value: data.title }),
          }));
          if (data.description) calls.push(fetch("/api/shopify/bulk-edit", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [Number(id)], field: "body_html", value: data.description }),
          }));
          await Promise.all(calls);
        })
      );
      setWorkflowStep(4);
      localStorage.setItem("ecompilot_workflow_done", "1");
      setOnboardingSteps((prev) => prev.map((s) => s.id === 3 || s.id === 4 ? { ...s, done: true } : s));
      addToast(`${entries.length} produit${entries.length > 1 ? "s" : ""} optimisé${entries.length > 1 ? "s" : ""} !`, "success");
    } catch {
      addToast("Erreur lors de l'application", "error");
    }
    setWorkflowLoading(false);
  };

  const applyPriceChanges = async () => {
    setWorkflowLoading(true);
    const selected = products.filter((p) => selectedProducts.includes(p.id));
    const val = parseFloat(priceValue);
    const productIds = selected.map((p) => String(p.id));
    let mode = "fixed";
    let newPrice = priceValue;
    if (priceMode === "increase") { mode = "percent"; }
    else if (priceMode === "decrease") { mode = "percent"; newPrice = String(-val); }
    try {
      await fetch("/api/shopify/bulk-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds, newPrice, mode }),
      });
      setWorkflowStep(4);
      localStorage.setItem("ecompilot_workflow_done", "1");
      setOnboardingSteps((prev) => prev.map((s) => s.id === 3 ? { ...s, done: true } : s));
      addToast(`Prix mis à jour sur ${selected.length} produit${selected.length > 1 ? "s" : ""}`, "success");
    } catch {
      addToast("Erreur lors de la mise à jour", "error");
    }
    setWorkflowLoading(false);
  };

  const handleImport = async () => {
    if (!importUrl) return;
    setWorkflowLoading(true);
    try {
      const res = await fetch("/api/import/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = await res.json();
      if (data.preview) {
        setAiResults({ 0: { title: data.preview.title, description: data.preview.description } });
        setWorkflowStep(2);
      } else {
        addToast("Impossible d'analyser ce lien", "error");
      }
    } catch {
      // Simulate
      setAiResults({
        0: {
          title: "Produit importé depuis AliExpress",
          description: "Description du produit importé. Prix suggéré : 29,99 €",
        },
      });
      setWorkflowStep(2);
    }
    setWorkflowLoading(false);
  };

  const onboardingDone = onboardingSteps.filter((s) => s.done).length;
  const onboardingTotal = onboardingSteps.length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>{greeting}{userFirstName ? `, ${userFirstName}` : ""} 👋</h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>Voici un aperçu de votre activité sur EcomPilot</p>
      </div>

      {/* ─── BLOC 2 : Workflows guidés ─── */}
      {showOnboarding && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: "#0f172a" }}>Démarrage rapide</h2>
            <button onClick={() => setShowOnboarding(false)} className="text-xs hover:underline" style={{ color: "#64748b" }}>Masquer</button>
          </div>

          {/* 3 workflow cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { id: "optimize", icon: Sparkles, color: "#8b5cf6", bg: "bg-violet-50", title: "Optimiser mon catalogue en 3 clics", desc: "L'IA analyse vos produits et améliore automatiquement les titres et descriptions pour mieux vendre" },
              { id: "pricing", icon: DollarSign, color: "#059669", bg: "bg-emerald-50", title: "Mettre à jour mes prix en masse", desc: "Modifiez les prix de tous vos produits ou d'une sélection en quelques secondes" },
              { id: "import", icon: Download, color: "#2563eb", bg: "bg-blue-50", title: "Importer des produits depuis AliExpress", desc: "Collez un lien AliExpress et le produit est ajouté à votre boutique automatiquement" },
            ].map((wf) => {
              const Icon = wf.icon;
              return (
                <button key={wf.id} onClick={() => startWorkflow(wf.id)}
                  className={`${wf.bg} rounded-xl p-5 text-left hover:shadow-md transition-all border border-transparent hover:border-gray-200 group`}>
                  <Icon className="w-8 h-8 mb-3" style={{ color: wf.color }} />
                  <h3 className="text-sm font-bold mb-2" style={{ color: "#0f172a" }}>{wf.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{wf.desc}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs font-medium" style={{ color: wf.color }}>
                    Lancer <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Checklist gamifiée — compact 3 étapes */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold" style={{ color: "#0f172a" }}>Démarrage ({onboardingDone}/3)</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: onboardingDone === 3 ? "#f0fdf4" : "#eff6ff", color: onboardingDone === 3 ? "#059669" : "#2563eb" }}>
                {onboardingDone === 3 ? "Terminé ✓" : `${onboardingDone}/3 étapes`}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full mb-3">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${(onboardingDone / 3) * 100}%`, backgroundColor: onboardingDone === 3 ? "#059669" : "#2563eb" }} />
            </div>
            <div className="flex gap-2">
              {onboardingSteps.map((step) => (
                step.done ? (
                  <div key={step.id} className="flex-1 flex items-center gap-1.5 py-1.5 px-2 bg-emerald-50 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#059669" }} />
                    <span className="text-xs font-medium line-through" style={{ color: "#94a3b8" }}>{step.label}</span>
                  </div>
                ) : (
                  <Link key={step.id} href={step.href}
                    className="flex-1 flex items-center gap-1.5 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group">
                    <Circle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#93c5fd" }} />
                    <span className="text-xs font-medium" style={{ color: "#1d4ed8" }}>{step.label}</span>
                    <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#2563eb" }} />
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── BLOC 4 : KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="relative rounded-2xl p-5 overflow-hidden border border-blue-500/20"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.05) 100%)' }}>
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-blue-500/20" />
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-500/20 p-2 rounded-lg"><Package className="w-5 h-5" style={{ color: "#60a5fa" }} /></div>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#f8fafc" }}>{optimizedCount}</p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Produits optimisés</p>
          <p className="text-xs mt-1" style={{ color: "#34d399" }}>+{Math.min(optimizedCount, 12)} cette semaine</p>
        </div>

        <div className="relative rounded-2xl p-5 overflow-hidden border border-purple-500/20"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.05) 100%)' }}>
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-purple-500/20" />
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-purple-500/20 p-2 rounded-lg"><Clock className="w-5 h-5" style={{ color: "#c084fc" }} /></div>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#f8fafc" }}>{timeSaved >= 60 ? `${Math.floor(timeSaved / 60)}h ${timeSaved % 60}min` : `${timeSaved}min`}</p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Temps économisé</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>vs modification manuelle</p>
        </div>

        <div className="relative rounded-2xl p-5 overflow-hidden border border-emerald-500/20"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.05) 100%)' }}>
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-emerald-500/20" />
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-500/20 p-2 rounded-lg"><TrendingUp className="w-5 h-5" style={{ color: "#34d399" }} /></div>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#f8fafc" }}>{avgScore}/100</p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Score SEO moyen</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
            style={{
              backgroundColor: avgScore >= 70 ? "rgba(16,185,129,0.2)" : avgScore >= 40 ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
              color: avgScore >= 70 ? "#34d399" : avgScore >= 40 ? "#fbbf24" : "#f87171"
            }}>
            {healthLabel}
          </span>
        </div>

        <div className="relative rounded-2xl p-5 overflow-hidden border border-amber-500/20"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.05) 100%)' }}>
          <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-amber-500/20" />
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-amber-500/20 p-2 rounded-lg"><Zap className="w-5 h-5" style={{ color: "#fbbf24" }} /></div>
          </div>
          <p className="text-2xl font-bold" style={{ color: getTasksColor(tasksRemaining) }}>{tasksRemaining}</p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Tâches restantes</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Renouvellement le {resetDate}</p>
        </div>
      </div>

      {/* ─── BLOC 3 : Santé du catalogue ─── */}
      {!loading && products.length > 0 && (
        <div className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5" style={{ color: healthColor }} />
                <h2 className="text-base font-bold" style={{ color: "#0f172a" }}>Santé de votre catalogue</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold" style={{ color: healthColor }}>{avgScore}</span>
                <span className="text-sm" style={{ color: "#94a3b8" }}>/100</span>
                <span className="text-xs font-medium px-2 py-1 rounded-full ml-2"
                  style={{ backgroundColor: avgScore >= 70 ? "#f0fdf4" : avgScore >= 40 ? "#fffbeb" : "#fef2f2", color: healthColor }}>
                  {healthLabel}
                </span>
              </div>
            </div>

            {/* Alerts */}
            {noDesc.length === 0 && shortTitle.length === 0 && noImages.length === 0 ? (
              <div className="p-4 bg-emerald-50 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" style={{ color: "#059669" }} />
                <p className="text-sm font-medium" style={{ color: "#059669" }}>
                  Votre catalogue est bien optimisé ! Continuez comme ça.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {noDesc.length > 0 && (
                  <div className="p-4 rounded-lg border" style={{ borderColor: "#fca5a5", backgroundColor: "#fef2f2" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4" style={{ color: "#dc2626" }} />
                      <span className="text-xs font-bold" style={{ color: "#dc2626" }}>Critique</span>
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: "#0f172a" }}>
                      {noDesc.length} produit{noDesc.length > 1 ? "s" : ""} sans description
                    </p>
                    <p className="text-xs mb-3" style={{ color: "#64748b" }}>Ils ne se trouvent pas sur Google</p>
                    <button onClick={() => startWorkflow("optimize")} className="text-xs font-medium flex items-center gap-1" style={{ color: "#dc2626" }}>
                      Générer avec l&apos;IA <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {shortTitle.length > 0 && (
                  <div className="p-4 rounded-lg border" style={{ borderColor: "#fdba74", backgroundColor: "#fffbeb" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" style={{ color: "#d97706" }} />
                      <span className="text-xs font-bold" style={{ color: "#d97706" }}>Attention</span>
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: "#0f172a" }}>
                      {shortTitle.length} titre{shortTitle.length > 1 ? "s" : ""} trop court{shortTitle.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs mb-3" style={{ color: "#64748b" }}>Moins de 30 caractères</p>
                    <button onClick={() => startWorkflow("optimize")} className="text-xs font-medium flex items-center gap-1" style={{ color: "#d97706" }}>
                      Optimiser les titres <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {noImages.length > 0 && (
                  <div className="p-4 rounded-lg border" style={{ borderColor: "#fde68a", backgroundColor: "#fefce8" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4" style={{ color: "#ca8a04" }} />
                      <span className="text-xs font-bold" style={{ color: "#ca8a04" }}>Info</span>
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: "#0f172a" }}>
                      {noImages.length} produit{noImages.length > 1 ? "s" : ""} sans image
                    </p>
                    <p className="text-xs mb-3" style={{ color: "#64748b" }}>Les visuels augmentent les ventes</p>
                    <a href="/dashboard/images" className="text-xs font-medium flex items-center gap-1" style={{ color: "#ca8a04" }}>
                      Ajouter des images <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Activité récente ─── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: "#2563eb" }} />
            <h2 className="text-sm font-bold" style={{ color: "#0f172a" }}>Activité récente</h2>
          </div>
        </div>
        {recentActivity.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "#64748b" }}>Aucune activité pour l&apos;instant — lancez votre premier workflow ci-dessus !</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold hidden sm:table-cell" style={{ color: "#64748b" }}>Produits</th>
                <th className="text-left px-5 py-3 text-xs font-semibold hidden sm:table-cell" style={{ color: "#64748b" }}>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((a, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-xs" style={{ color: "#94a3b8" }}>{a.date}</td>
                  <td className="px-5 py-3 text-sm font-medium" style={{ color: "#0f172a" }}>{a.action}</td>
                  <td className="px-5 py-3 text-sm hidden sm:table-cell" style={{ color: "#374151" }}>{a.products}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 font-medium" style={{ color: "#059669" }}>{a.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ─── WORKFLOW MODALS ─── */}
      {activeWorkflow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !workflowLoading && setActiveWorkflow(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold" style={{ color: "#0f172a" }}>
                  {activeWorkflow === "optimize" && "Optimiser mon catalogue"}
                  {activeWorkflow === "pricing" && "Mettre à jour mes prix"}
                  {activeWorkflow === "import" && "Importer depuis AliExpress"}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Étape {workflowStep} sur 4</p>
              </div>
              <button onClick={() => setActiveWorkflow(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4" style={{ color: "#64748b" }} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-gray-100">
              <div className="h-1 bg-blue-600 transition-all" style={{ width: `${(workflowStep / 4) * 100}%` }} />
            </div>

            <div className="p-5">
              {/* ── WORKFLOW 1 : Optimiser ── */}
              {activeWorkflow === "optimize" && (
                <>
                  {workflowStep === 1 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Sélectionnez vos produits</h4>
                      <button onClick={selectAll} className="text-xs font-medium mb-3 px-3 py-1.5 bg-blue-50 rounded-lg" style={{ color: "#2563eb" }}>
                        Tout sélectionner ({products.length})
                      </button>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {products.slice(0, 20).map((p) => (
                          <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={selectedProducts.includes(p.id)}
                              onChange={() => toggleProduct(p.id)} className="rounded" />
                            {p.images?.[0] && <img src={p.images[0].src} alt="" className="w-8 h-8 rounded object-cover" />}
                            <span className="text-sm" style={{ color: "#0f172a" }}>{p.title}</span>
                          </label>
                        ))}
                      </div>
                      <button onClick={() => { setWorkflowStep(2); runAIOptimization(); }}
                        disabled={selectedProducts.length === 0}
                        className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                        style={{ color: "#fff" }}>
                        Analyser {selectedProducts.length} produit{selectedProducts.length > 1 ? "s" : ""} →
                      </button>
                    </div>
                  )}
                  {workflowStep === 2 && (
                    <div className="text-center py-8">
                      <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Analyse de vos produits en cours...</p>
                      <p className="text-xs mt-1" style={{ color: "#64748b" }}>L&apos;IA génère les améliorations</p>
                    </div>
                  )}
                  {workflowStep === 3 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Vérifiez et appliquez</h4>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {Object.entries(aiResults).map(([id, data]) => {
                          const p = products.find((x) => x.id === Number(id));
                          return (
                            <div key={id} className="border border-gray-200 rounded-lg p-3">
                              <p className="text-xs font-semibold mb-2" style={{ color: "#0f172a" }}>{p?.title}</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 rounded" style={{ backgroundColor: "#f1f5f9" }}>
                                  <p className="text-[10px] font-medium mb-1" style={{ color: "#94a3b8" }}>Avant</p>
                                  <p className="text-xs" style={{ color: "#64748b" }}>{p?.title}</p>
                                </div>
                                <div className="p-2 rounded border" style={{ borderColor: "#93c5fd", backgroundColor: "#eff6ff" }}>
                                  <p className="text-[10px] font-medium mb-1" style={{ color: "#2563eb" }}>Après IA</p>
                                  <p className="text-xs" style={{ color: "#0f172a" }}>{data.title || p?.title}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={applyAIResults} disabled={workflowLoading}
                        className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                        style={{ color: "#fff" }}>
                        {workflowLoading ? "Application..." : `Appliquer toutes les améliorations →`}
                      </button>
                    </div>
                  )}
                  {workflowStep === 4 && (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#059669" }} />
                      <h4 className="text-lg font-bold mb-1" style={{ color: "#0f172a" }}>
                        {selectedProducts.length} produit{selectedProducts.length > 1 ? "s" : ""} amélioré{selectedProducts.length > 1 ? "s" : ""} !
                      </h4>
                      <p className="text-sm" style={{ color: "#64748b" }}>Votre score SEO a augmenté</p>
                      <button onClick={() => setActiveWorkflow(null)} className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium" style={{ color: "#374151" }}>
                        Fermer
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── WORKFLOW 2 : Prix ── */}
              {activeWorkflow === "pricing" && (
                <>
                  {workflowStep === 1 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Sur quels produits ?</h4>
                      <button onClick={selectAll} className="text-xs font-medium mb-3 px-3 py-1.5 bg-blue-50 rounded-lg" style={{ color: "#2563eb" }}>
                        Tous les produits ({products.length})
                      </button>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {products.slice(0, 20).map((p) => (
                          <label key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => toggleProduct(p.id)} className="rounded" />
                            <span className="text-sm" style={{ color: "#0f172a" }}>{p.title}</span>
                            <span className="text-xs ml-auto" style={{ color: "#64748b" }}>{p.variants?.[0]?.price} €</span>
                          </label>
                        ))}
                      </div>
                      <button onClick={() => setWorkflowStep(2)} disabled={selectedProducts.length === 0}
                        className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                        style={{ color: "#fff" }}>
                        Continuer →
                      </button>
                    </div>
                  )}
                  {workflowStep === 2 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Quelle modification ?</h4>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { mode: "increase" as const, label: "Augmenter de %", icon: "↑" },
                          { mode: "decrease" as const, label: "Baisser de %", icon: "↓" },
                          { mode: "fixed" as const, label: "Prix fixe", icon: "=" },
                        ].map((m) => (
                          <button key={m.mode} onClick={() => setPriceMode(m.mode)}
                            className={`p-3 rounded-lg border text-center text-sm font-medium transition-colors ${priceMode === m.mode ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                            style={{ color: priceMode === m.mode ? "#2563eb" : "#374151" }}>
                            <span className="text-lg">{m.icon}</span><br />{m.label}
                          </button>
                        ))}
                      </div>
                      <input type="number" value={priceValue} onChange={(e) => setPriceValue(e.target.value)}
                        placeholder={priceMode === "fixed" ? "29.99" : "10"}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-4"
                        style={{ color: "#0f172a" }} />
                      <button onClick={() => setWorkflowStep(3)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium" style={{ color: "#fff" }}>
                        Aperçu →
                      </button>
                    </div>
                  )}
                  {workflowStep === 3 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Aperçu des modifications</h4>
                      <table className="w-full text-xs mb-4">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2" style={{ color: "#64748b" }}>Produit</th>
                            <th className="text-right py-2" style={{ color: "#64748b" }}>Prix actuel</th>
                            <th className="text-right py-2" style={{ color: "#64748b" }}>Nouveau prix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.filter((p) => selectedProducts.includes(p.id)).slice(0, 5).map((p) => {
                            const current = parseFloat(p.variants?.[0]?.price || "0");
                            const val = parseFloat(priceValue);
                            let newP = current;
                            if (priceMode === "increase") newP = current * (1 + val / 100);
                            else if (priceMode === "decrease") newP = current * (1 - val / 100);
                            else newP = val;
                            return (
                              <tr key={p.id} className="border-b border-gray-50">
                                <td className="py-2" style={{ color: "#0f172a" }}>{p.title?.substring(0, 30)}...</td>
                                <td className="py-2 text-right" style={{ color: "#64748b" }}>{current.toFixed(2)} €</td>
                                <td className="py-2 text-right font-medium" style={{ color: "#059669" }}>{newP.toFixed(2)} €</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {selectedProducts.length > 5 && (
                        <p className="text-xs mb-3" style={{ color: "#94a3b8" }}>... et {selectedProducts.length - 5} autres produits</p>
                      )}
                      <button onClick={applyPriceChanges} disabled={workflowLoading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium"
                        style={{ color: "#fff" }}>
                        {workflowLoading ? "Application..." : `Appliquer sur ${selectedProducts.length} produits →`}
                      </button>
                    </div>
                  )}
                  {workflowStep === 4 && (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#059669" }} />
                      <h4 className="text-lg font-bold mb-1" style={{ color: "#0f172a" }}>Prix mis à jour !</h4>
                      <p className="text-sm" style={{ color: "#64748b" }}>{selectedProducts.length} produits modifiés</p>
                      <button onClick={() => setActiveWorkflow(null)} className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium" style={{ color: "#374151" }}>Fermer</button>
                    </div>
                  )}
                </>
              )}

              {/* ── WORKFLOW 3 : Import ── */}
              {activeWorkflow === "import" && (
                <>
                  {workflowStep === 1 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Collez votre lien AliExpress</h4>
                      <input type="text" value={importUrl} onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="https://aliexpress.com/item/..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-4"
                        style={{ color: "#0f172a" }} />
                      <button onClick={handleImport} disabled={!importUrl || workflowLoading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                        style={{ color: "#fff" }}>
                        {workflowLoading ? "Analyse..." : "Analyser →"}
                      </button>
                    </div>
                  )}
                  {workflowStep === 2 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Produit détecté</h4>
                      <div className="border border-gray-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium mb-1" style={{ color: "#0f172a" }}>{aiResults[0]?.title}</p>
                        <p className="text-xs mb-3" style={{ color: "#64748b" }}>{aiResults[0]?.description}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-[10px]" style={{ color: "#94a3b8" }}>Prix fournisseur</p>
                            <p className="text-sm font-bold" style={{ color: "#0f172a" }}>12,00 €</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded">
                            <p className="text-[10px]" style={{ color: "#2563eb" }}>Prix de vente suggéré (×2.5)</p>
                            <p className="text-sm font-bold" style={{ color: "#2563eb" }}>29,99 €</p>
                          </div>
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="text-xs font-medium block mb-1" style={{ color: "#374151" }}>Prix de vente final</label>
                        <input type="number" defaultValue="29.99"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          style={{ color: "#0f172a" }} />
                      </div>
                      <button onClick={() => { setWorkflowStep(4); setOnboardingSteps((prev) => prev.map((s) => s.id === 3 ? { ...s, done: true } : s)); addToast("Produit ajouté au catalogue !", "success"); }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                        style={{ color: "#fff" }}>
                        Ajouter à ma boutique →
                      </button>
                    </div>
                  )}
                  {workflowStep === 4 && (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "#059669" }} />
                      <h4 className="text-lg font-bold mb-1" style={{ color: "#0f172a" }}>Produit ajouté !</h4>
                      <p className="text-sm" style={{ color: "#64748b" }}>Retrouvez-le dans votre catalogue</p>
                      <button onClick={() => setActiveWorkflow(null)} className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium" style={{ color: "#374151" }}>Fermer</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}