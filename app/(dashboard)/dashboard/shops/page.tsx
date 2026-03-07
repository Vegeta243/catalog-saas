"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Store, Plus, ExternalLink, Trash2, RefreshCw, CheckCircle, AlertCircle,
  ChevronDown, ArrowRight, Star, PackageSearch, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/lib/toast";

interface Shop {
  id: string;
  shop_domain: string;
  shop_name: string | null;
  is_active: boolean;
  access_token?: string | null;
  created_at?: string;
}

export default function ShopsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2563eb" }} /></div>}>
      <ShopsContent />
    </Suspense>
  );
}

function ShopsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShopId, setActiveShopId] = useState<string>("");
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShopUrl, setNewShopUrl] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState("");

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "1") {
      addToast("✅ Boutique Shopify connectée avec succès ! Vos produits sont maintenant accessibles.", "success");
      // Clean URL
      router.replace("/dashboard/shops");
    } else if (error === "save_failed") {
      addToast("Erreur lors de la sauvegarde du token. Réessayez.", "error");
      router.replace("/dashboard/shops");
    }
  }, [searchParams, addToast, router]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("shops")
        .select("id, shop_domain, shop_name, is_active, access_token, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const shopsList = data || [];
      setShops(shopsList);
      const saved = localStorage.getItem("ecompilot_active_shop");
      if (saved && shopsList.find((s: Shop) => s.id === saved)) {
        setActiveShopId(saved);
      } else if (shopsList.length > 0) {
        setActiveShopId(shopsList[0].id);
        localStorage.setItem("ecompilot_active_shop", shopsList[0].id);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const setActiveShop = (id: string) => {
    setActiveShopId(id);
    localStorage.setItem("ecompilot_active_shop", id);
    setShowSwitcher(false);
  };

  const handleConnect = async () => {
    setConnectError("");
    setConnectSuccess("");
    const raw = newShopUrl.trim();
    if (!raw) { setConnectError("Entrez votre domaine Shopify."); return; }

    // Parse domain from any Shopify URL format
    let input = raw.toLowerCase().replace(/^https?:\/\//, "");
    let shopSlug = "";
    const adminMatch = input.match(/admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)/);
    if (adminMatch) { shopSlug = adminMatch[1]; }
    else {
      const myshopifyMatch = input.match(/^([a-z0-9][a-z0-9-]*)\.myshopify\.com/);
      if (myshopifyMatch) { shopSlug = myshopifyMatch[1]; }
      else {
        const clean = input.split("/")[0].split("?")[0].replace(/\s/g, "");
        if (/^[a-z0-9][a-z0-9-]*$/.test(clean)) shopSlug = clean;
      }
    }
    if (!shopSlug) {
      setConnectError("Format invalide. Ex: ma-boutique ou ma-boutique.myshopify.com");
      return;
    }

    const domain = `${shopSlug}.myshopify.com`;
    setConnectLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setConnectError("Vous devez être connecté."); setConnectLoading(false); return; }

      // Upsert: insert or reactivate if already exists
      const { data: upserted, error } = await supabase
        .from("shops")
        .upsert(
          {
            user_id: user.id,
            shop_domain: domain,
            shop_name: shopSlug,
            is_active: true,
            scopes: "",
            access_token: "",
          },
          { onConflict: "user_id,shop_domain" }
        )
        .select()
        .single();

      if (error) {
        setConnectError("Erreur lors de l'ajout. Réessayez.");
      } else {
        setConnectSuccess(`✅ Boutique "${upserted.shop_name}" ajoutée !`);
        setNewShopUrl("");
        await fetchShops();
        setTimeout(() => { setShowAddModal(false); setConnectSuccess(""); }, 1500);
      }
    } catch {
      setConnectError("Erreur réseau. Vérifiez votre connexion.");
    }
    setConnectLoading(false);
  };

  const handleDisconnect = async (shopId: string) => {
    if (!confirm("Déconnecter cette boutique ? Vos données resteront intactes.")) return;
    try {
      const supabase = createClient();
      await supabase.from("shops").delete().eq("id", shopId);
      const remaining = shops.filter((s) => s.id !== shopId);
      setShops(remaining);
      if (activeShopId === shopId) {
        if (remaining.length > 0) setActiveShop(remaining[0].id);
        else { setActiveShopId(""); localStorage.removeItem("ecompilot_active_shop"); }
      }
    } catch { /* silent */ }
  };

  const activeShop = shops.find((s) => s.id === activeShopId) || shops[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2563eb" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Mes boutiques</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Gérez et basculez entre vos boutiques Shopify
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: "#2563eb", color: "#fff" }}
        >
          <Plus className="w-4 h-4" /> Ajouter une boutique
        </button>
      </div>

      {/* Empty state */}
      {shops.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
            <Store className="w-8 h-8" style={{ color: "#2563eb" }} />
          </div>
          <h2 className="text-xl font-bold mb-3" style={{ color: "#0f172a" }}>Aucune boutique connectée</h2>
          <p className="text-base mb-6 max-w-sm mx-auto" style={{ color: "#64748b" }}>
            Connectez votre boutique Shopify pour commencer à optimiser votre catalogue avec l&apos;IA.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
            style={{ backgroundColor: "#2563eb", color: "#fff" }}
          >
            <Plus className="w-4 h-4" /> Connecter ma boutique Shopify
          </button>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: "⚡", title: "30 secondes", desc: "pour connecter votre boutique" },
              { icon: "🔒", title: "Sécurisé", desc: "OAuth officiel Shopify · RGPD" },
              { icon: "🤖", title: "IA incluse", desc: "descriptions + SEO dès la connexion" },
            ].map((item) => (
              <div key={item.title} className="p-4 rounded-xl" style={{ backgroundColor: "#f8fafc" }}>
                <span className="text-2xl mb-2 block">{item.icon}</span>
                <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{item.title}</p>
                <p className="text-xs" style={{ color: "#64748b" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Active shop banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" style={{ color: "#2563eb" }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#2563eb" }}>Boutique active</span>
              </div>
              {shops.length > 1 && (
                <div className="relative">
                  <button onClick={() => setShowSwitcher(!showSwitcher)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200 text-xs font-medium hover:bg-blue-50"
                    style={{ color: "#2563eb" }}>
                    Changer <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSwitcher ? "rotate-180" : ""}`} />
                  </button>
                  {showSwitcher && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-xl z-10 overflow-hidden">
                      <div className="p-2">
                        {shops.map((s) => (
                          <button key={s.id} onClick={() => setActiveShop(s.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${s.id === activeShopId ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}>
                            <Store className="w-4 h-4 flex-shrink-0" style={{ color: s.id === activeShopId ? "#2563eb" : "#64748b" }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: "#0f172a" }}>{s.shop_name || s.shop_domain}</p>
                              <p className="text-[11px] truncate" style={{ color: "#94a3b8" }}>{s.shop_domain}</p>
                            </div>
                            {s.id === activeShopId && <CheckCircle className="w-4 h-4" style={{ color: "#2563eb" }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white border border-blue-200 flex items-center justify-center">
                <Store className="w-7 h-7" style={{ color: "#2563eb" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate" style={{ color: "#0f172a" }}>{activeShop?.shop_name || activeShop?.shop_domain}</h2>
                <p className="text-sm truncate" style={{ color: "#64748b" }}>{activeShop?.shop_domain}</p>
              </div>
            </div>
          </div>

          {/* Shops grid */}
          <div>
            <h3 className="text-base font-bold mb-4" style={{ color: "#0f172a" }}>Toutes vos boutiques ({shops.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shops.map((shop) => {
                const isActive = shop.id === activeShopId;
                const hasToken = !!shop.access_token;
                return (
                  <div key={shop.id} className={`bg-white rounded-xl border-2 p-5 transition-all ${isActive ? "border-blue-400 ring-2 ring-blue-100 shadow-md" : "border-gray-200 hover:shadow-sm"}`}>
                    {isActive && (
                      <div className="mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dbeafe", color: "#2563eb" }}>Active</span>
                      </div>
                    )}
                    {/* Token warning */}
                    {!hasToken && (
                      <div className="mb-3 flex items-center justify-between p-2.5 rounded-lg" style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
                        <span className="text-xs font-medium" style={{ color: "#92400e" }}>⚠️ Connexion incomplète — produits non accessibles</span>
                        <a
                          href={`/api/auth/shopify?shop=${shop.shop_domain}`}
                          className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: "#f59e0b", color: "#fff" }}
                        >
                          Connecter
                        </a>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive ? "#dbeafe" : "#eff6ff" }}>
                          <Store className="w-5 h-5" style={{ color: "#2563eb" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#0f172a" }}>{shop.shop_name || shop.shop_domain}</p>
                          <p className="text-xs truncate" style={{ color: "#94a3b8" }}>{shop.shop_domain}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                        style={{ backgroundColor: shop.is_active ? "#d1fae5" : "#fef2f2", color: shop.is_active ? "#059669" : "#dc2626" }}>
                        {shop.is_active ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {shop.is_active ? "OK" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isActive ? (
                        <button onClick={() => setActiveShop(shop.id)}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                          <ArrowRight className="w-3.5 h-3.5" /> Basculer
                        </button>
                      ) : (
                        <div className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: "#f0fdf4", color: "#059669" }}>
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </div>
                      )}
                      <button onClick={() => router.push("/dashboard/products")}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Produits">
                        <PackageSearch className="w-4 h-4" style={{ color: "#64748b" }} />
                      </button>
                      <a href={`https://${shop.shop_domain}`} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                        <ExternalLink className="w-4 h-4" style={{ color: "#64748b" }} />
                      </a>
                      <button onClick={() => handleDisconnect(shop.id)}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
                      </button>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => setShowAddModal(true)}
                className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
                  <Plus className="w-6 h-6" style={{ color: "#2563eb" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "#2563eb" }}>Ajouter une boutique</p>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add shop modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => { setShowAddModal(false); setConnectError(""); setConnectSuccess(""); setNewShopUrl(""); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1" style={{ color: "#0f172a" }}>Ajouter une boutique</h2>
            <p className="text-sm mb-5" style={{ color: "#64748b" }}>Entrez votre domaine Shopify pour l&apos;ajouter à votre compte.</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Domaine Shopify</label>
                <input
                  type="text"
                  value={newShopUrl}
                  onChange={(e) => { setNewShopUrl(e.target.value); setConnectError(""); }}
                  placeholder="ma-boutique ou ma-boutique.myshopify.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  style={{ color: "#0f172a" }}
                  onKeyDown={(e) => e.key === "Enter" && !connectLoading && handleConnect()}
                  autoFocus
                />
                <p className="mt-1 text-[11px]" style={{ color: "#94a3b8" }}>
                  Accepte : ma-boutique, ma-boutique.myshopify.com, ou lien admin.shopify.com
                </p>
              </div>

              {connectError && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#dc2626", backgroundColor: "#fef2f2" }}>{connectError}</p>
              )}
              {connectSuccess && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#059669", backgroundColor: "#f0fdf4" }}>{connectSuccess}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAddModal(false); setConnectError(""); setConnectSuccess(""); setNewShopUrl(""); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50"
                  style={{ color: "#374151" }}>
                  Annuler
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connectLoading || !newShopUrl.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: "#2563eb", color: "#fff" }}>
                  {connectLoading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Ajout…</>
                    : <>Ajouter <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSwitcher && <div className="fixed inset-0 z-0" onClick={() => setShowSwitcher(false)} />}
    </div>
  );
}
