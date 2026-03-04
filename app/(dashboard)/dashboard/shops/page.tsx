"use client";

import { useState } from "react";
import { Store, Plus, ExternalLink, Trash2, RefreshCw, CheckCircle, AlertCircle, Settings } from "lucide-react";

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShopUrl, setNewShopUrl] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Mes boutiques</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Gérez vos boutiques Shopify connectées</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: "#2563eb", color: "#fff" }}>
          <Plus className="w-4 h-4" /> Ajouter une boutique
        </button>
      </div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shops.map((shop) => {
          const status = statusConfig[shop.status];
          const StatusIcon = status.icon;
          return (
            <div key={shop.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
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
                <button className="flex-1 py-2 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                  style={{ color: "#374151" }}>
                  <RefreshCw className="w-3.5 h-3.5" /> Synchroniser
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

      {/* Add Shop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: "#0f172a" }}>Ajouter une boutique</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>URL de la boutique Shopify</label>
                <input type="text" value={newShopUrl} onChange={(e) => setNewShopUrl(e.target.value)}
                  placeholder="votre-boutique.myshopify.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50"
                  style={{ color: "#374151" }}>
                  Annuler
                </button>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "#2563eb", color: "#fff" }}>
                  Connecter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
