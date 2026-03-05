"use client";

import { useState, useEffect } from "react";
import { Store, Plus, ExternalLink, Trash2, RefreshCw, CheckCircle, AlertCircle, Settings, ChevronDown, ArrowRight, Star } from "lucide-react";

interface Shop {
  id: string;
  name: string;
  domain: string;
  products: number;
  status: "connected" | "disconnected" | "syncing";
  lastSync: string;
  plan: string;
}

const mockShops: Shop[] = [
  { id: "1", name: "Ma Boutique Mode", domain: "ma-boutique-mode.myshopify.com", products: 342, status: "connected", lastSync: "Il y a 5 min", plan: "Pro" },
  { id: "2", name: "Sport & Outdoor", domain: "sport-outdoor.myshopify.com", products: 128, status: "connected", lastSync: "Il y a 2h", plan: "Pro" },
  { id: "3", name: "Déco Maison", domain: "deco-maison-fr.myshopify.com", products: 0, status: "disconnected", lastSync: "Jamais", plan: "Free" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  connected: { label: "Connectée", color: "#059669", bg: "#d1fae5", icon: CheckCircle },
  disconnected: { label: "Déconnectée", color: "#dc2626", bg: "#fef2f2", icon: AlertCircle },
  syncing: { label: "Synchronisation…", color: "#d97706", bg: "#fffbeb", icon: RefreshCw },
};

export default function ShopsPage() {
  const [shops] = useState<Shop[]>(mockShops);
  const [activeShopId, setActiveShopId] = useState<string>("1");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [newShopUrl, setNewShopUrl] = useState("");
  const [newShopName, setNewShopName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("ecompilot_active_shop");
    if (saved) setActiveShopId(saved);
  }, []);

  const setActiveShop = (id: string) => {
    setActiveShopId(id);
    localStorage.setItem("ecompilot_active_shop", id);
    setShowSwitcher(false);
  };

  const activeShop = shops.find((s) => s.id === activeShopId) || shops[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Mes boutiques</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Gérez et basculez entre vos boutiques Shopify</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: "#2563eb", color: "#fff" }}>
          <Plus className="w-4 h-4" /> Ajouter une boutique
        </button>
      </div>

      {/* ══════ ACTIVE SHOP SWITCHER ══════ */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" style={{ color: "#2563eb" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#2563eb" }}>Boutique active</span>
          </div>
          <div className="relative">
            <button onClick={() => setShowSwitcher(!showSwitcher)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200 text-xs font-medium hover:bg-blue-50 transition-colors"
              style={{ color: "#2563eb" }}>
              Changer de boutique <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSwitcher ? "rotate-180" : ""}`} />
            </button>
            {showSwitcher && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-10 overflow-hidden">
                <div className="p-2">
                  {shops.filter((s) => s.status === "connected").map((shop) => (
                    <button key={shop.id} onClick={() => setActiveShop(shop.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${shop.id === activeShopId ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"}`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: shop.id === activeShopId ? "#dbeafe" : "#f1f5f9" }}>
                        <Store className="w-4 h-4" style={{ color: shop.id === activeShopId ? "#2563eb" : "#64748b" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#0f172a" }}>{shop.name}</p>
                        <p className="text-[11px] truncate" style={{ color: "#94a3b8" }}>{shop.products} produits</p>
                      </div>
                      {shop.id === activeShopId && (
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#2563eb" }} />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 p-2">
                  <button onClick={() => { setShowSwitcher(false); setShowAddModal(true); }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium hover:bg-gray-50"
                    style={{ color: "#64748b" }}>
                    <Plus className="w-3.5 h-3.5" /> Connecter une nouvelle boutique
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white border border-blue-200 flex items-center justify-center">
            <Store className="w-7 h-7" style={{ color: "#2563eb" }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: "#0f172a" }}>{activeShop?.name}</h2>
            <p className="text-sm" style={{ color: "#64748b" }}>{activeShop?.domain}</p>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{activeShop?.products}</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>produits</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "#059669" }}>{activeShop?.lastSync}</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>dernière sync</p>
            </div>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: "#64748b" }}>
          Toutes les actions (IA, édition, import) s&apos;appliquent à cette boutique. Changez à tout moment.
        </p>
      </div>

      {/* ══════ ALL SHOPS GRID ══════ */}
      <div>
        <h3 className="text-base font-bold mb-4" style={{ color: "#0f172a" }}>Toutes vos boutiques ({shops.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map((shop) => {
            const status = statusConfig[shop.status];
            const StatusIcon = status.icon;
            const isActive = shop.id === activeShopId;
            return (
              <div key={shop.id} className={`bg-white rounded-xl border-2 p-5 transition-all ${isActive ? "border-blue-400 ring-2 ring-blue-100 shadow-md" : "border-gray-200 hover:shadow-sm"}`}>
                {isActive && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dbeafe", color: "#2563eb" }}>
                      Boutique active
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: isActive ? "#dbeafe" : "#eff6ff" }}>
                      <Store className="w-5 h-5" style={{ color: "#2563eb" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{shop.name}</p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>{shop.domain}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                    style={{ backgroundColor: status.bg, color: status.color }}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: "#f8fafc" }}>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>Produits</p>
                    <p className="text-lg font-bold" style={{ color: "#0f172a" }}>{shop.products}</p>
                  </div>
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: "#f8fafc" }}>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>Dernière sync</p>
                    <p className="text-xs font-medium mt-1" style={{ color: "#374151" }}>{shop.lastSync}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && shop.status === "connected" && (
                    <button onClick={() => setActiveShop(shop.id)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      style={{ backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                      <ArrowRight className="w-3.5 h-3.5" /> Basculer ici
                    </button>
                  )}
                  {isActive && (
                    <div className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: "#f0fdf4", color: "#059669" }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Active
                    </div>
                  )}
                  <button className="flex-1 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                    style={{ color: "#374151" }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Sync
                  </button>
                  <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Paramètres">
                    <Settings className="w-4 h-4" style={{ color: "#64748b" }} />
                  </button>
                  <a href={`https://${shop.domain}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Ouvrir Shopify">
                    <ExternalLink className="w-4 h-4" style={{ color: "#64748b" }} />
                  </a>
                  <button className="p-2 rounded-lg border border-gray-200 hover:bg-red-50" title="Supprimer">
                    <Trash2 className="w-4 h-4" style={{ color: "#dc2626" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Shop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1" style={{ color: "#0f172a" }}>Ajouter une boutique</h2>
            <p className="text-sm mb-5" style={{ color: "#64748b" }}>Connectez une nouvelle boutique Shopify à votre compte</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Nom de la boutique</label>
                <input type="text" value={newShopName} onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="Ex: Ma Boutique Mode"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>URL Shopify</label>
                <input type="text" value={newShopUrl} onChange={(e) => setNewShopUrl(e.target.value)}
                  placeholder="votre-boutique.myshopify.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }} />
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}>
                <p className="text-xs" style={{ color: "#1e40af" }}>
                  Vous serez redirigé vers Shopify pour autoriser l&apos;accès à votre boutique. Aucune modification ne sera effectuée sans votre accord.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50"
                  style={{ color: "#374151" }}>
                  Annuler
                </button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "#2563eb", color: "#fff" }}>
                  Connecter la boutique
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
