"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Zap, PackageSearch, Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLAN_FEATURES } from "@/lib/credits";

export default function OnboardingPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("vous");
  const [shopUrl, setShopUrl] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/login"); return; }
        const firstName =
          user.user_metadata?.first_name ||
          user.email?.split("@")[0] ||
          "vous";
        setUserName(firstName);

        // If the user already has a shop, skip onboarding
        const { data: shops } = await supabase
          .from("shops")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1);
        if (shops && shops.length > 0) {
          router.replace("/dashboard");
        }
      } catch { /* silent */ }
    };
    init();
  }, [router]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError("");
    if (!shopUrl.trim()) { setConnectError("Entrez l'URL de votre boutique Shopify."); return; }
    setConnectLoading(true);
    const domain = shopUrl
      .replace(/https?:\/\//, "")
      .replace(/\/$/, "")
      .trim();
    router.push(`/api/auth/shopify?shop=${encodeURIComponent(domain)}`);
  };

  const freeLimits = {
    stores: PLAN_FEATURES.free.shops,
    products: PLAN_FEATURES.free.products,
    ai_tasks_per_month: PLAN_FEATURES.free.tasks,
  };

  return (
    <div className="min-h-screen bg-[#e8f0f8] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.svg" alt="EcomPilot Elite" className="h-10 w-auto" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-4">
              <Store className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Bienvenue sur EcomPilot, {userName}&nbsp;! 👋
            </h1>
            <p className="text-slate-500 text-sm">
              Connectez votre première boutique Shopify pour commencer à optimiser vos produits.
            </p>
          </div>

          {/* Connect form */}
          <form onSubmit={handleConnect} className="mb-8">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              URL de votre boutique Shopify
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ma-boutique.myshopify.com"
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={connectLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition-colors"
              >
                {connectLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Connecter
              </button>
            </div>
            {connectError && (
              <p className="mt-2 text-sm text-red-500">{connectError}</p>
            )}
          </form>

          {/* Free plan summary */}
          <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Votre forfait actuel
              </span>
              <span className="text-xs bg-slate-200 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                Gratuit
              </span>
            </div>
            <ul className="space-y-2">
              {[
                { icon: Store, label: `${freeLimits.stores} boutique connectée` },
                { icon: PackageSearch, label: `Jusqu'à ${freeLimits.products} produits` },
                { icon: Sparkles, label: `${freeLimits.ai_tasks_per_month} tâches IA / mois` },
                { icon: Zap, label: "Optimisation SEO de base" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2 border border-blue-300 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Voir tous les forfaits
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Skip link */}
          <p className="text-center text-xs text-slate-400">
            <Link href="/dashboard/shops" className="hover:text-slate-600 underline underline-offset-2">
              Je connecterai ma boutique plus tard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
