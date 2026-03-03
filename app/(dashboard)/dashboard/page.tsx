"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Store,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  BarChart3,
  Activity,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    shopsConnected: 0,
    lastSync: "",
    revenue: 0,
    pendingUpdates: 0,
  });
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bonjour");
    else if (hour < 18) setGreeting("Bon après-midi");
    else setGreeting("Bonsoir");

    setStats({
      totalProducts: 120,
      shopsConnected: 3,
      lastSync: "Il y a 12 minutes",
      revenue: 15420,
      pendingUpdates: 7,
    });
  }, []);

  const kpiCards = [
    {
      title: "Produits totaux",
      value: stats.totalProducts.toString(),
      change: "+12%",
      trend: "up" as const,
      icon: Package,
      color: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
    },
    {
      title: "Boutiques connectées",
      value: stats.shopsConnected.toString(),
      change: "+1",
      trend: "up" as const,
      icon: Store,
      color: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50",
    },
    {
      title: "Chiffre d'affaires",
      value: `${stats.revenue.toLocaleString('fr-FR')} €`,
      change: "+8.2%",
      trend: "up" as const,
      icon: TrendingUp,
      color: "from-violet-500 to-violet-600",
      bgLight: "bg-violet-50",
    },
    {
      title: "Mises à jour en attente",
      value: stats.pendingUpdates.toString(),
      change: "-3",
      trend: "down" as const,
      icon: Clock,
      color: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50",
    },
  ];

  const recentActivities = [
    { date: "2026-03-04", action: "Synchronisation automatique terminée", type: "success", icon: CheckCircle2 },
    { date: "2026-03-04", action: "3 prix mis à jour en masse", type: "success", icon: CheckCircle2 },
    { date: "2026-03-03", action: "Nouveau produit ajouté: \"Snowboard Pro X\"", type: "info", icon: ShoppingBag },
    { date: "2026-03-03", action: "Alerte stock bas: 2 produits", type: "warning", icon: AlertCircle },
    { date: "2026-03-02", action: "Boutique \"ma-boutique\" connectée", type: "success", icon: Store },
    { date: "2026-03-01", action: "Export CSV de 120 produits", type: "info", icon: BarChart3 },
  ];

  const quickActions = [
    { label: "Synchroniser maintenant", icon: RefreshCw, color: "bg-blue-600 hover:bg-blue-700" },
    { label: "Ajouter un produit", icon: Package, color: "bg-emerald-600 hover:bg-emerald-700" },
    { label: "Modifier les prix", icon: TrendingUp, color: "bg-violet-600 hover:bg-violet-700" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>{greeting}, Utilisateur 👋</h1>
        <p className="mt-1 text-sm" style={{ color: '#64748b' }}>Voici un aperçu de votre activité sur EcomPilot</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className={`${action.color} text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all`}
            >
              <Icon className="w-4 h-4" style={{ color: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.bgLight} p-2.5 rounded-lg`}>
                  <Icon className="w-5 h-5" style={{ color: card.color.includes('blue') ? '#3b82f6' : card.color.includes('emerald') ? '#059669' : card.color.includes('violet') ? '#8b5cf6' : '#d97706' }} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${card.trend === 'up' ? 'bg-emerald-50' : 'bg-red-50'}`} style={{ color: card.trend === 'up' ? '#059669' : '#dc2626' }}>
                  {card.trend === 'up' ? <TrendingUp className="w-3 h-3" style={{ color: '#059669' }} /> : <TrendingDown className="w-3 h-3" style={{ color: '#dc2626' }} />}
                  {card.change}
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#0f172a' }}>{card.value}</p>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>{card.title}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: '#3b82f6' }} />
              <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>Activités récentes</h2>
            </div>
            <a href="#" className="text-sm font-medium flex items-center gap-1" style={{ color: '#3b82f6' }}>
              Voir tout <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
            </a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivities.map((activity, index) => {
              const Icon = activity.icon;
              const typeColor = activity.type === 'success' ? '#059669' : activity.type === 'warning' ? '#d97706' : '#3b82f6';
              return (
                <div key={index} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${activity.type === 'success' ? 'bg-emerald-50' : activity.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                    <Icon className="w-4 h-4" style={{ color: typeColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{activity.action}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>{activity.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sync Status + Quick Stats */}
        <div className="space-y-6">
          {/* Sync Status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-5 h-5" style={{ color: '#059669' }} />
              <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>État de la synchronisation</h2>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-medium" style={{ color: '#059669' }}>Connecté et synchronisé</span>
            </div>
            <p className="text-sm" style={{ color: '#64748b' }}>Dernière synchro : {stats.lastSync}</p>
            <button className="mt-4 w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2" style={{ color: '#374151' }}>
              <RefreshCw className="w-4 h-4" style={{ color: '#374151' }} />
              Synchroniser maintenant
            </button>
          </div>

          {/* Performance */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5" style={{ color: '#8b5cf6' }} />
              <h2 className="text-base font-semibold" style={{ color: '#0f172a' }}>Performance</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#64748b' }}>Produits actifs</span>
                <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>112 / 120</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '93%' }}></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#64748b' }}>Brouillons</span>
                <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>5 / 120</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '4%' }}></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: '#64748b' }}>Archivés</span>
                <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>3 / 120</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full" style={{ width: '2.5%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}