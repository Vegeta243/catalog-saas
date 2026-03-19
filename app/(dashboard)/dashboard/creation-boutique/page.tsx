"use client";

import { useState, useEffect } from "react";
import { Sparkles, Palette, LayoutGrid, Rocket, CheckCircle2, RefreshCw, Store, Crown } from "lucide-react";
import { useToast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Step = 1 | 2 | 3;

interface Shop {
  id: string;
  name: string;
  shop_domain: string;
}

interface DesignConfig {
  ambiance: string;
  primaryColor: string;
  sections: string[];
}

const AMBIANCES = [
  { id: "minimaliste", label: "Minimaliste", emoji: "✨", desc: "Épuré, espaces blancs, typographie sobre" },
  { id: "luxe", label: "Luxe", emoji: "💎", desc: "Élégant, noir & or, premium" },
  { id: "dynamique", label: "Dynamique", emoji: "⚡", desc: "Coloré, jeune, énergique" },
  { id: "nature", label: "Nature", emoji: "🌿", desc: "Bio, vert, matériaux naturels" },
];

const COLOR_PALETTES = [
  { id: "#3b82f6", label: "Bleu", bg: "#eff6ff" },
  { id: "#10b981", label: "Vert", bg: "#f0fdf4" },
  { id: "#f59e0b", label: "Ambre", bg: "#fffbeb" },
  { id: "#8b5cf6", label: "Violet", bg: "#f5f3ff" },
  { id: "#ef4444", label: "Rouge", bg: "#fef2f2" },
  { id: "#0f172a", label: "Ardoise", bg: "#f8fafc" },
];

const HOMEPAGE_SECTIONS = [
  { id: "hero", label: "Bannière héro", desc: "Grande image + titre accrocheur + CTA" },
  { id: "featured_products", label: "Produits phares", desc: "Sélection de 4 à 8 produits mis en avant" },
  { id: "benefits", label: "Bénéfices", desc: "3 icônes : livraison, qualité, retours" },
  { id: "testimonials", label: "Avis clients", desc: "Carousel d'avis étoilés" },
  { id: "newsletter", label: "Newsletter", desc: "Formulaire d'inscription email" },
  { id: "about", label: "À propos", desc: "Histoire courte de la marque" },
  { id: "instagram", label: "Galerie Instagram", desc: "Feed photos stylisé" },
  { id: "faq", label: "FAQ", desc: "5 questions / réponses fréquentes" },
];

export default function CreationBoutiquePage() {
  const { addToast } = useToast();
  const [plan, setPlan] = useState<string | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [step, setStep] = useState<Step>(1);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  const [config, setConfig] = useState<DesignConfig>({
    ambiance: "minimaliste",
    primaryColor: "#3b82f6",
    sections: ["hero", "featured_products", "benefits", "newsletter"],
  });

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [userRes, shopRes] = await Promise.all([
          supabase.from("users").select("plan").eq("id", user.id).single(),
          supabase.from("shops").select("id, name, shop_domain").eq("user_id", user.id).limit(1),
        ]);
        setPlan(userRes.data?.plan || "free");
        setShop((shopRes.data as Shop[] | null)?.[0] ?? null);
      } catch { setPlan("free"); }
      finally { setLoadingShop(false); }
    };
    init();
  }, []);

  const toggleSection = (id: string) => {
    setConfig(c => ({
      ...c,
      sections: c.sections.includes(id)
        ? c.sections.filter(s => s !== id)
        : [...c.sections, id],
    }));
  };

  const handleApply = async () => {
    if (!shop) {
      addToast("Aucune boutique connectée", "error");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/stores/design-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: shop.id, ...config }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        addToast("Design appliqué avec succès !", "success");
      } else {
        addToast(data.error || "Erreur lors de l'application du design", "error");
      }
    } catch {
      addToast("Erreur réseau", "error");
    } finally {
      setApplying(false);
    }
  };

  if (plan !== null && !["pro", "scale"].includes(plan || "")) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-6">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>Design IA de boutique</h1>
        <p className="text-base mb-6" style={{ color: "#64748b" }}>
          Disponible à partir du forfait <strong>Pro (89€/mois)</strong>.
        </p>
        <div className="bg-white rounded-2xl border border-blue-100 p-6 mb-6 text-left space-y-3">
          {["L'IA génère du contenu sur-mesure pour votre boutique connectée",
            "Choix d'ambiance visuelle + palette de couleurs",
            "Sélection des sections de votre page d'accueil",
            "Application directe dans votre thème Shopify",
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
              <span className="text-sm" style={{ color: "#374151" }}>{f}</span>
            </div>
          ))}
        </div>
        <Link href="/dashboard/credits" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-600 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-shadow">
          <Crown className="w-4 h-4" /> Passer au forfait Pro
        </Link>
      </div>
    );
  }

  if (!loadingShop && !shop) {
    return (
      <div className="max-w-xl mx-auto pt-12 text-center">
        <Store className="w-14 h-14 mx-auto mb-4 text-blue-400" />
        <h2 className="text-xl font-bold mb-2" style={{ color: "#0f172a" }}>Aucune boutique connectée</h2>
        <p className="text-sm mb-5" style={{ color: "#64748b" }}>
          Connectez d&apos;abord votre boutique Shopify pour pouvoir personnaliser son design.
        </p>
        <Link href="/dashboard/shops" className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold text-white">
          Connecter une boutique
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto pt-12 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#0f172a" }}>🎉 Design appliqué !</h2>
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>
          Votre boutique <strong>{shop?.name}</strong> a été mise à jour avec le design <strong>{config.ambiance}</strong>.
        </p>
        <a href={`https://${shop?.shop_domain}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold text-white">
          <Store className="w-4 h-4" /> Voir ma boutique
        </a>
      </div>
    );
  }

  if (applying) {
    return (
      <div className="max-w-xl mx-auto pt-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <h2 className="text-xl font-bold mb-2" style={{ color: "#0f172a" }}>Application du design…</h2>
          <p className="text-sm" style={{ color: "#64748b" }}>L&apos;IA génère et applique le contenu sur votre boutique</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#0f172a" }}>
          <Sparkles className="w-6 h-6 text-blue-600" />
          Designer ma boutique avec l&apos;IA
        </h1>
        {shop && (
          <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: "#64748b" }}>
            <Store className="w-3.5 h-3.5 text-emerald-500" />
            Boutique : <span className="font-medium text-emerald-600">{shop.name}</span>
          </p>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["Style", "Sections", "Confirmer"] as const).map((label, i) => {
          const s = (i + 1) as Step;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? "bg-blue-600 text-white" : step > s ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  {step > s ? "✓" : s}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step === s ? "text-blue-600" : step > s ? "text-emerald-600" : "text-gray-400"}`}>{label}</span>
              </div>
              {i < 2 && <div className={`h-0.5 w-8 flex-shrink-0 ${step > s ? "bg-emerald-400" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">

        {/* ── Step 1 : Ambiance & Couleur ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: "#0f172a" }}>
                <Palette className="inline w-4 h-4 mr-1 text-blue-600" />
                Étape 1 — Ambiance visuelle
              </h2>
              <p className="text-xs" style={{ color: "#64748b" }}>Choisissez le style général de votre boutique</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {AMBIANCES.map(a => (
                <button key={a.id} onClick={() => setConfig(c => ({ ...c, ambiance: a.id }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    config.ambiance === a.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <span className="text-xl">{a.emoji}</span>
                  <p className="text-sm font-semibold mt-1" style={{ color: "#0f172a" }}>{a.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{a.desc}</p>
                </button>
              ))}
            </div>

            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "#374151" }}>Couleur principale</p>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PALETTES.map(c => (
                  <button key={c.id} onClick={() => setConfig(cfg => ({ ...cfg, primaryColor: c.id }))}
                    className={`w-9 h-9 rounded-full border-4 transition-all ${
                      config.primaryColor === c.id ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.id }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white">
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 : Sections homepage ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: "#0f172a" }}>
                <LayoutGrid className="inline w-4 h-4 mr-1 text-blue-600" />
                Étape 2 — Sections de la page d&apos;accueil
              </h2>
              <p className="text-xs" style={{ color: "#64748b" }}>Sélectionnez les sections à afficher</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {HOMEPAGE_SECTIONS.map(s => {
                const active = config.sections.includes(s.id);
                return (
                  <button key={s.id} onClick={() => toggleSection(s.id)}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-2.5 ${
                      active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 border-2 flex items-center justify-center ${
                      active ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                    }`}>
                      {active && <span className="text-xs leading-none">✓</span>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "#0f172a" }}>{s.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">← Retour</button>
              <button onClick={() => setStep(3)} disabled={config.sections.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-sm font-semibold text-white">
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 : Confirmation ────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: "#0f172a" }}>
                <Rocket className="inline w-4 h-4 mr-1 text-blue-600" />
                Étape 3 — Confirmer l&apos;application
              </h2>
              <p className="text-xs" style={{ color: "#64748b" }}>Vérifiez vos choix avant d&apos;appliquer le design</p>
            </div>

            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Boutique</span>
                <span className="text-xs font-semibold" style={{ color: "#0f172a" }}>{shop?.name} ({shop?.shop_domain})</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Ambiance</span>
                <span className="text-xs font-semibold capitalize" style={{ color: "#0f172a" }}>
                  {AMBIANCES.find(a => a.id === config.ambiance)?.emoji} {config.ambiance}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Couleur principale</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#0f172a" }}>
                  <span className="w-4 h-4 rounded-full inline-block border border-gray-200" style={{ backgroundColor: config.primaryColor }} />
                  {COLOR_PALETTES.find(c => c.id === config.primaryColor)?.label}
                </span>
              </div>
              <div className="flex items-start justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Sections ({config.sections.length})</span>
                <div className="flex flex-wrap gap-1 max-w-xs justify-end">
                  {config.sections.map(id => (
                    <span key={id} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                      {HOMEPAGE_SECTIONS.find(s => s.id === id)?.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">← Retour</button>
              <button onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 rounded-xl text-sm font-bold text-white shadow-md">
                <Sparkles className="w-4 h-4" /> Appliquer le design
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

