"use client";

import { useState } from 'react';
import {
  Store,
  Lock,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  RefreshCw,
  Package,
} from 'lucide-react';

export default function ConnectShopify() {
  const [shopDomain, setShopDomain] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    if (!shopDomain) return;
    setIsConnecting(true);
    window.location.href = `/api/auth/shopify?shop=${shopDomain}`;
  };

  const features = [
    { icon: Package, title: 'Synchronisation des produits', desc: 'Importez automatiquement tous vos produits Shopify' },
    { icon: RefreshCw, title: 'Mise à jour en temps réel', desc: 'Les changements sont synchronisés instantanément' },
    { icon: Zap, title: 'Modification en masse', desc: 'Modifiez les prix de centaines de produits en un clic' },
    { icon: ShieldCheck, title: 'Sécurisé et fiable', desc: 'Connexion OAuth officielle Shopify' },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Connection form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
              <Store className="w-6 h-6" style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#0f172a' }}>Connecter votre boutique</h1>
              <p className="text-sm" style={{ color: '#64748b' }}>Shopify</p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold" style={{ color: '#2563eb' }}>1</span>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Entrez l'URL de votre boutique</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>Le format est votre-boutique.myshopify.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>2</span>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Autorisez l'accès via Shopify</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>Vous serez redirigé vers Shopify pour autoriser EcomPilot</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>3</span>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Commencez à gérer vos produits</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>Vos produits seront importés automatiquement</p>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block" style={{ color: '#374151' }}>URL de votre boutique</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="ma-boutique.myshopify.com"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                style={{ color: '#0f172a' }}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleConnect}
            disabled={!shopDomain || isConnecting}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" style={{ color: '#ffffff' }} />
                <span style={{ color: '#ffffff' }}>Connexion en cours...</span>
              </>
            ) : (
              <>
                <span style={{ color: '#ffffff' }}>Connecter Shopify</span>
                <ArrowRight className="w-4 h-4" style={{ color: '#ffffff' }} />
              </>
            )}
          </button>

          {/* Security note */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
            <p className="text-xs" style={{ color: '#94a3b8' }}>Connexion sécurisée via OAuth 2.0 Shopify</p>
          </div>
        </div>

        {/* Right: Features */}
        <div className="space-y-5">
          <div className="mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#0f172a' }}>Pourquoi connecter votre boutique ?</h2>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>EcomPilot vous aide à gérer votre catalogue Shopify efficacement</p>
          </div>

          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex gap-4 items-start hover:border-emerald-200 hover:shadow-md transition-all">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" style={{ color: '#059669' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#0f172a' }}>{feature.title}</h3>
                  <p className="text-xs mt-1" style={{ color: '#64748b' }}>{feature.desc}</p>
                </div>
              </div>
            );
          })}

          {/* Trust badges */}
          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs font-medium" style={{ color: '#64748b' }}>SSL chiffré</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs font-medium" style={{ color: '#64748b' }}>RGPD conforme</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
              <span className="text-xs font-medium" style={{ color: '#64748b' }}>Support 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}