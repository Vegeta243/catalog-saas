"use client";

import { useState, useEffect } from "react";
import { Sparkles, Store, Package, Palette, FileText, Rocket, Crown, CheckCircle2, RefreshCw, ChevronRight } from "lucide-react";
import { useToast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Step = 1 | 2 | 3 | 4 | 5;

interface StoreConfig {
  concept: string;
  targetMarket: string;
  style: string;
  productCount: number;
  source: string;
  priceRange: string;
  storeName: string;
  tagline: string;
}

const PROGRESS_STEPS = [
  "Concept créé",
  "Produits trouvés",
  "Boutique Shopify configurée",
  "Produits importés",
  "Design personnalisé",
  "Contenu SEO généré",
];

export default function CreationBoutiquePage() {
  const { addToast } = useToast();
  const [plan, setPlan] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [creating, setCreating] = useState(false);
  const [progressStep, setProgressStep] = useState(-1);
  const [storeUrl, setStoreUrl] = useState("");
  const [config, setConfig] = useState<StoreConfig>({
    concept: "",
    targetMarket: "france",
    style: "minimaliste",
    productCount: 20,
    source: "aliexpress",
    priceRange: "mid",
    storeName: "",
    tagline: "",
  });
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("users").select("plan").eq("id", user.id).single();
        setPlan(data?.plan || "free");
      } catch { setPlan("free"); }
    };
    fetchPlan();
  }, []);

  const isScalePlan = plan === "scale";

  const generateNames = async () => {
    if (!config.concept) return;
    setLoadingNames(true);
    try {
      const res = await fetch("/api/stores/generate-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: config.concept, style: config.style }),
      });
      const data = await res.json();
      setNameSuggestions(data.names || []);
    } catch {
      // Demo names
      setNameSuggestions([`${config.concept.split(" ")[0]}Shop`, "ModernStore", "VogueBrand", "TrendHub", "StyleVault"]);
    } finally {
      setLoadingNames(false);
    }
  };

  const handleCreate = async () => {
    if (!config.concept || !config.storeName) {
      addToast("Veuillez remplir le concept et le nom de la boutique", "error");
      return;
    }
    setCreating(true);
    setProgressStep(0);

    try {
      const res = await fetch("/api/stores/create-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      // Simulate progress while waiting
      let p = 0;
      const interval = setInterval(() => {
        p = Math.min(p + 1, PROGRESS_STEPS.length - 1);
        setProgressStep(p);
      }, 3000);

      const data = await res.json();
      clearInterval(interval);
      setProgressStep(PROGRESS_STEPS.length - 1);

      if (res.ok && data.storeUrl) {
        setStoreUrl(data.storeUrl);
        addToast("Boutique créée avec succès !", "success");
      } else {
        addToast(data.error || "Erreur lors de la création", "error");
        setCreating(false);
        setProgressStep(-1);
      }
    } catch {
      addToast("Erreur réseau", "error");
      setCreating(false);
      setProgressStep(-1);
    }
  };

  // Plan gate for non-Scale users
  if (plan !== null && !isScalePlan) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6">
          <Crown className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: "#0f172a" }}>
          Création de boutique IA
        </h1>
        <p className="text-base mb-6" style={{ color: "#64748b" }}>
          Cette fonctionnalité est disponible uniquement avec le forfait <strong>Scale (129€/mois)</strong>.
        </p>
        <div className="bg-white rounded-2xl border border-amber-200 p-6 mb-6 text-left space-y-3">
          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Ce que vous obtenez avec Scale :</p>
          {[
            "L'IA crée une boutique Shopify complète depuis zéro",
            "20 à 50 produits importés automatiquement",
            "Design professionnel personnalisé selon votre niche",
            "Descriptions SEO générées pour chaque produit",
            "Boutiques illimitées + 100 000 tâches IA/mois",
            "Support dédié sous 4h",
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
              <span className="text-sm" style={{ color: "#374151" }}>{f}</span>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard/credits"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-shadow"
        >
          <Crown className="w-4 h-4" /> Passer au forfait Scale
        </Link>
      </div>
    );
  }

  if (storeUrl) {
    return (
      <div className="max-w-xl mx-auto pt-12 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#0f172a" }}>🎉 Votre boutique est prête !</h2>
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>
          Votre boutique Shopify a été créée et configurée automatiquement.
        </p>
        <a
          href={storeUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold text-white"
        >
          <Store className="w-4 h-4" /> Voir ma boutique
        </a>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="max-w-xl mx-auto pt-12">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <Rocket className="w-12 h-12 mx-auto mb-3 text-blue-600" />
            <h2 className="text-xl font-bold" style={{ color: "#0f172a" }}>Création en cours…</h2>
            <p className="text-sm mt-1" style={{ color: "#64748b" }}>Cela peut prendre 2-3 minutes</p>
          </div>
          <div className="space-y-3">
            {PROGRESS_STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                {i < progressStep ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : i === progressStep ? (
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                )}
                <span className={`text-sm ${i <= progressStep ? "font-medium" : ""}`}
                  style={{ color: i < progressStep ? "#059669" : i === progressStep ? "#2563eb" : "#94a3b8" }}>
                  {i < progressStep ? `✅ ${label}` : i === progressStep ? label + "…" : label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#0f172a" }}>
          <Sparkles className="w-6 h-6 text-blue-600" />
          Créer ma boutique avec l&apos;IA
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          L&apos;IA crée une boutique Shopify complète et professionnelle en quelques minutes
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {([1, 2, 3, 4, 5] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === s ? "bg-blue-600 text-white" : step > s ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"}`}>
              {step > s ? "✓" : s}
            </div>
            {i < 4 && <div className={`h-0.5 w-8 ${step > s ? "bg-emerald-400" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Étape 1 — Niche & Concept</h2>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Décrivez votre boutique *</label>
              <textarea
                value={config.concept}
                onChange={e => setConfig(c => ({ ...c, concept: e.target.value }))}
                placeholder="ex: Boutique de vêtements de sport femme, style athleisure..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{ color: "#0f172a" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Marché cible</label>
              <div className="flex gap-2 flex-wrap">
                {[["france", "🇫🇷 France"], ["europe", "🇪🇺 Europe"], ["monde", "🌍 Monde"]].map(([val, label]) => (
                  <button key={val} onClick={() => setConfig(c => ({ ...c, targetMarket: val }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${config.targetMarket === val ? "border-blue-500 text-blue-700 bg-blue-50" : "border-gray-200"}`}
                    style={config.targetMarket !== val ? { color: "#374151" } : {}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Style de boutique</label>
              <div className="flex gap-2 flex-wrap">
                {["Minimaliste", "Luxe", "Dynamique", "Nature", "Tech"].map(s => (
                  <button key={s} onClick={() => setConfig(c => ({ ...c, style: s.toLowerCase() }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${config.style === s.toLowerCase() ? "border-blue-500 text-blue-700 bg-blue-50" : "border-gray-200"}`}
                    style={config.style !== s.toLowerCase() ? { color: "#374151" } : {}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Étape 2 — Produits</h2>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Nombre de produits</label>
              <div className="flex gap-2">
                {[10, 20, 50].map(n => (
                  <button key={n} onClick={() => setConfig(c => ({ ...c, productCount: n }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${config.productCount === n ? "border-blue-500 text-blue-700 bg-blue-50" : "border-gray-200"}`}
                    style={config.productCount !== n ? { color: "#374151" } : {}}>
                    {n} produits
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Source</label>
              <div className="flex gap-2">
                {[["aliexpress", "AliExpress"], ["cj", "CJ Dropshipping"], ["both", "Les deux"]].map(([val, label]) => (
                  <button key={val} onClick={() => setConfig(c => ({ ...c, source: val }))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${config.source === val ? "border-blue-500 text-blue-700 bg-blue-50" : "border-gray-200"}`}
                    style={config.source !== val ? { color: "#374151" } : {}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Gamme de prix</label>
              <div className="flex gap-2">
                {[["budget", "Budget (0-20€)"], ["mid", "Milieu (20-60€)"], ["premium", "Premium (60€+)"]].map(([val, label]) => (
                  <button key={val} onClick={() => setConfig(c => ({ ...c, priceRange: val }))}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${config.priceRange === val ? "border-blue-500 text-blue-700 bg-blue-50" : "border-gray-200"}`}
                    style={config.priceRange !== val ? { color: "#374151" } : {}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Étape 3 — Branding</h2>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: "#374151" }}>Nom de la boutique *</label>
                <button onClick={generateNames} disabled={!config.concept || loadingNames}
                  className="text-xs text-blue-600 hover:underline disabled:opacity-50 flex items-center gap-1">
                  {loadingNames ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Suggérer des noms IA
                </button>
              </div>
              <input
                type="text" value={config.storeName}
                onChange={e => setConfig(c => ({ ...c, storeName: e.target.value }))}
                placeholder="ex: SportElite, TrendZone..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{ color: "#0f172a" }}
              />
              {nameSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {nameSuggestions.map(name => (
                    <button key={name} onClick={() => setConfig(c => ({ ...c, storeName: name }))}
                      className="px-2.5 py-1 rounded-lg text-xs border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Slogan (optionnel)</label>
              <input
                type="text" value={config.tagline}
                onChange={e => setConfig(c => ({ ...c, tagline: e.target.value }))}
                placeholder="ex: Le style qui vous ressemble"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                style={{ color: "#0f172a" }}
              />
            </div>
          </div>
        )}

        {/* Step 4 - Content */}
        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Étape 4 — Contenu IA</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>
              L&apos;IA va générer automatiquement pour vous :
            </p>
            <div className="space-y-2">
              {[
                ["Texte hero de la page d&apos;accueil", FileText],
                ["Page À propos complète", FileText],
                ["Descriptions de collections", Package],
                ["Titres + descriptions SEO de tous les produits", Sparkles],
                ["Méta-titres et descriptions pour Google", Sparkles],
              ].map(([label, Icon], i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm" style={{ color: "#374151" }}>{String(label).replace(/&apos;/g, "'")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5 - Summary */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Étape 5 — Aperçu & Création</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: "#64748b" }}>Concept</span><span className="font-medium text-right max-w-xs" style={{ color: "#0f172a" }}>{config.concept.substring(0, 60)}{config.concept.length > 60 ? "…" : ""}</span></div>
              <div className="flex justify-between"><span style={{ color: "#64748b" }}>Nom</span><span className="font-medium" style={{ color: "#0f172a" }}>{config.storeName}</span></div>
              <div className="flex justify-between"><span style={{ color: "#64748b" }}>Produits</span><span className="font-medium" style={{ color: "#0f172a" }}>{config.productCount} produits ({config.source})</span></div>
              <div className="flex justify-between"><span style={{ color: "#64748b" }}>Style</span><span className="font-medium capitalize" style={{ color: "#0f172a" }}>{config.style}</span></div>
              <div className="flex justify-between"><span style={{ color: "#64748b" }}>Marché</span><span className="font-medium capitalize" style={{ color: "#0f172a" }}>{config.targetMarket}</span></div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs" style={{ color: "#92400e" }}>
              ⚠️ Cette opération va créer une vraie boutique Shopify connectée à votre compte. Vous aurez besoin d&apos;une boutique Shopify de partenaire ou d&apos;un compte de développement.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          {step > 1 ? (
            <button onClick={() => setStep(s => (s - 1) as Step)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              style={{ color: "#374151" }}>
              Précédent
            </button>
          ) : <div />}

          {step < 5 ? (
            <button
              onClick={() => setStep(s => (s + 1) as Step)}
              disabled={step === 1 && !config.concept}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-sm font-semibold text-white transition-colors"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!config.storeName || !config.concept}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 rounded-xl text-sm font-bold text-white shadow-lg transition-all"
            >
              <Rocket className="w-4 h-4" /> Créer ma boutique
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
