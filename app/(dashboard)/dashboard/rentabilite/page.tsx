"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, TrendingUp, TrendingDown, Package, RefreshCw,
  Save, AlertTriangle, CheckCircle, Info, Calculator,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function asImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && 'src' in img) {
        const src = (img as { src?: unknown }).src;
        return typeof src === 'string' ? src : '';
      }
      return '';
    }).filter(Boolean);
  }
  if (typeof value === 'string') {
    try { return asImageUrls(JSON.parse(value)); } catch { return []; }
  }
  return [];
}

interface Product {
  id: string;
  title: string;
  price: string;
  images?: unknown;
  variants?: { price: string }[];
}

interface ProfitSettings {
  shopify_plan_monthly: number;
  shopify_transaction_fee_pct: number;
  payment_processing_fee_pct: number;
  payment_processing_fixed: number;
  avg_ad_spend_pct: number;
  avg_shipping_cost: number;
  avg_return_rate_pct: number;
  avg_return_cost: number;
  vat_rate_pct: number;
  income_tax_rate_pct: number;
  ecompilot_monthly: number;
  other_tools_monthly: number;
  monthly_fixed_costs: number;
  avg_orders_per_month: number;
}

const DEFAULT_SETTINGS: ProfitSettings = {
  shopify_plan_monthly: 32,
  shopify_transaction_fee_pct: 0.5,
  payment_processing_fee_pct: 1.4,
  payment_processing_fixed: 0.25,
  avg_ad_spend_pct: 15,
  avg_shipping_cost: 5,
  avg_return_rate_pct: 3,
  avg_return_cost: 8,
  vat_rate_pct: 20,
  income_tax_rate_pct: 15,
  ecompilot_monthly: 29,
  other_tools_monthly: 0,
  monthly_fixed_costs: 0,
  avg_orders_per_month: 100,
};

interface BreakdownLine {
  icon: string;
  label: string;
  amount: number;
  pct: number;
  isPositive?: boolean;
  isSeparator?: boolean;
  isInfo?: boolean;
}

function computeProfit(
  sellingPrice: number,
  costPrice: number,
  s: ProfitSettings
): { breakdown: BreakdownLine[]; netProfit: number; netMarginPct: number; breakEvenPrice: number } {
  if (sellingPrice <= 0) {
    return { breakdown: [], netProfit: 0, netMarginPct: 0, breakEvenPrice: 0 };
  }

  // Fixed costs per order
  const monthlyOrders = s.avg_orders_per_month || 1;
  const shopifyPerOrder = s.shopify_plan_monthly / monthlyOrders;
  const toolsPerOrder = (s.ecompilot_monthly + s.other_tools_monthly) / monthlyOrders;
  const fixedPerOrder = s.monthly_fixed_costs / monthlyOrders;

  // Variable costs
  const shopifyTxFee = sellingPrice * (s.shopify_transaction_fee_pct / 100);
  const paymentFee = sellingPrice * (s.payment_processing_fee_pct / 100) + s.payment_processing_fixed;
  const adSpend = sellingPrice * (s.avg_ad_spend_pct / 100);
  const returnProvision = (s.avg_return_rate_pct / 100) * (s.avg_return_cost + sellingPrice * 0.1);

  const preтaxProfit =
    sellingPrice -
    costPrice -
    shopifyPerOrder -
    shopifyTxFee -
    paymentFee -
    adSpend -
    s.avg_shipping_cost -
    returnProvision -
    toolsPerOrder -
    fixedPerOrder;

  const taxAmount = preтaxProfit > 0 ? preтaxProfit * (s.income_tax_rate_pct / 100) : 0;
  const netProfit = preтaxProfit - taxAmount;
  const netMarginPct = (netProfit / sellingPrice) * 100;

  const pct = (v: number) => ((v / sellingPrice) * 100);

  const breakdown: BreakdownLine[] = [
    { icon: "", label: "Prix de vente", amount: sellingPrice, pct: 100, isPositive: true },
    { icon: "——", label: "", amount: 0, pct: 0, isSeparator: true },
    { icon: "", label: "Coût produit", amount: -costPrice, pct: -pct(costPrice) },
    { icon: "", label: `Frais Shopify (répartis sur ${monthlyOrders} cmd/mois)`, amount: -shopifyPerOrder, pct: -pct(shopifyPerOrder) },
    { icon: "", label: `Frais paiement (${s.payment_processing_fee_pct}% + ${s.payment_processing_fixed}€)`, amount: -paymentFee, pct: -pct(paymentFee) },
    ...(s.shopify_transaction_fee_pct > 0 ? [{ icon: "", label: `Frais transaction Shopify (${s.shopify_transaction_fee_pct}%)`, amount: -shopifyTxFee, pct: -pct(shopifyTxFee) }] : []),
    { icon: "", label: `Publicité estimée (${s.avg_ad_spend_pct}% du CA)`, amount: -adSpend, pct: -pct(adSpend) },
    { icon: "", label: "Expédition", amount: -s.avg_shipping_cost, pct: -pct(s.avg_shipping_cost) },
    { icon: "", label: `Retours — provision (${s.avg_return_rate_pct}%)`, amount: -returnProvision, pct: -pct(returnProvision) },
    { icon: "️", label: "Outils SaaS (répartis)", amount: -toolsPerOrder, pct: -pct(toolsPerOrder) },
    ...(fixedPerOrder > 0 ? [{ icon: "", label: "Charges fixes (réparties)", amount: -fixedPerOrder, pct: -pct(fixedPerOrder) }] : []),
    { icon: "——", label: "", amount: 0, pct: 0, isSeparator: true },
    {
      icon: "", label: "Résultat avant impôt", amount: preтaxProfit, pct: pct(preтaxProfit),
      isPositive: preтaxProfit >= 0,
    },
    {
      icon: "️", label: `TVA (${s.vat_rate_pct}%) — collectée, non incluse dans le coût`,
      amount: sellingPrice * (s.vat_rate_pct / 100),
      pct: s.vat_rate_pct, isInfo: true,
    },
    { icon: "", label: `Impôt estimé (${s.income_tax_rate_pct}%)`, amount: -taxAmount, pct: -pct(taxAmount) },
    { icon: "——", label: "", amount: 0, pct: 0, isSeparator: true },
    {
      icon: "", label: "BÉNÉFICE NET", amount: netProfit, pct: netMarginPct,
      isPositive: netProfit >= 0,
    },
  ];

  // Break-even price: solve for selling_price where costs = selling_price
  // Simplified: costs = costPrice + shopifyPerOrder + toolsPerOrder + fixedPerOrder + shipping + returnFixedPart
  //             + sellingPrice * (txFee% + payment% + ad% + returnVar%)
  // => SP * (1 - varRates) = fixedCosts
  const varRates = (s.shopify_transaction_fee_pct + s.payment_processing_fee_pct + s.avg_ad_spend_pct + s.avg_return_rate_pct * 0.1) / 100;
  const fixedCosts = costPrice + shopifyPerOrder + s.payment_processing_fixed + s.avg_shipping_cost + (s.avg_return_rate_pct / 100) * s.avg_return_cost + toolsPerOrder + fixedPerOrder;
  const breakEvenPrice = varRates < 1 ? fixedCosts / (1 - varRates) : 0;

  return { breakdown, netProfit, netMarginPct, breakEvenPrice };
}

export default function RentabilitePage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [costPrice, setCostPrice] = useState<string>("");
  const [settings, setSettings] = useState<ProfitSettings>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingCost, setSavingCost] = useState(false);
  const [simulationQty, setSimulationQty] = useState(100);

  useEffect(() => { document.title = "Rentabilité | EcomPilot"; }, []);

  // Load products
  useEffect(() => {
    fetch("/api/shopify/products")
      .then((r) => r.json())
      .then((d) => {
        setProducts(
          (d.products || []).map((p: Product) => ({
            ...p,
            price: p.variants?.[0]?.price || p.price || "0",
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  // Load profit settings + saved cost for selected product
  useEffect(() => {
    const loadSettings = async () => {
      setLoadingSettings(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: settingsData } = await supabase
          .from("user_profit_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (settingsData) {
          setSettings({
            shopify_plan_monthly: Number(settingsData.shopify_plan_monthly) || DEFAULT_SETTINGS.shopify_plan_monthly,
            shopify_transaction_fee_pct: Number(settingsData.shopify_transaction_fee_pct) || DEFAULT_SETTINGS.shopify_transaction_fee_pct,
            payment_processing_fee_pct: Number(settingsData.payment_processing_fee_pct) || DEFAULT_SETTINGS.payment_processing_fee_pct,
            payment_processing_fixed: Number(settingsData.payment_processing_fixed) || DEFAULT_SETTINGS.payment_processing_fixed,
            avg_ad_spend_pct: Number(settingsData.avg_ad_spend_pct) || DEFAULT_SETTINGS.avg_ad_spend_pct,
            avg_shipping_cost: Number(settingsData.avg_shipping_cost) || DEFAULT_SETTINGS.avg_shipping_cost,
            avg_return_rate_pct: Number(settingsData.avg_return_rate_pct) || DEFAULT_SETTINGS.avg_return_rate_pct,
            avg_return_cost: Number(settingsData.avg_return_cost) || DEFAULT_SETTINGS.avg_return_cost,
            vat_rate_pct: Number(settingsData.vat_rate_pct) || DEFAULT_SETTINGS.vat_rate_pct,
            income_tax_rate_pct: Number(settingsData.income_tax_rate_pct) || DEFAULT_SETTINGS.income_tax_rate_pct,
            ecompilot_monthly: Number(settingsData.ecompilot_monthly) || DEFAULT_SETTINGS.ecompilot_monthly,
            other_tools_monthly: Number(settingsData.other_tools_monthly) || DEFAULT_SETTINGS.other_tools_monthly,
            monthly_fixed_costs: Number(settingsData.monthly_fixed_costs) || DEFAULT_SETTINGS.monthly_fixed_costs,
            avg_orders_per_month: Number(settingsData.avg_orders_per_month) || DEFAULT_SETTINGS.avg_orders_per_month,
          });
        }
      } catch { /* silent */ }
      finally { setLoadingSettings(false); }
    };
    loadSettings();
  }, []);

  // Load saved cost when product changes
  useEffect(() => {
    if (!selectedProduct) return;
    const loadCost = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("product_costs")
          .select("cost_price")
          .eq("user_id", user.id)
          .eq("shopify_product_id", selectedProduct.id)
          .maybeSingle();
        if (data) setCostPrice(String(data.cost_price));
        else setCostPrice("");
      } catch { /* silent */ }
    };
    loadCost();
  }, [selectedProduct]);

  const saveCost = async () => {
    if (!selectedProduct) return;
    setSavingCost(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      await supabase.from("product_costs").upsert({
        user_id: user.id,
        shopify_product_id: selectedProduct.id,
        product_title: selectedProduct.title,
        cost_price: parseFloat(costPrice) || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,shopify_product_id" });
      addToast("Coût produit sauvegardé", "success");
    } catch {
      addToast("Erreur lors de la sauvegarde", "error");
    } finally {
      setSavingCost(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sellingPrice = selectedProduct ? parseFloat(selectedProduct.price) || 0 : 0;
  const cost = parseFloat(costPrice) || 0;
  const { breakdown, netProfit, netMarginPct, breakEvenPrice } = computeProfit(sellingPrice, cost, settings);

  const marginColor = netMarginPct >= 30 ? "#059669" : netMarginPct >= 15 ? "#d97706" : "#dc2626";
  const marginBg = netMarginPct >= 30 ? "#ecfdf5" : netMarginPct >= 15 ? "#fffbeb" : "#fef2f2";
  const marginLabel = netMarginPct >= 30 ? "Excellente marge " : netMarginPct >= 15 ? "Marge correcte" : "Marge insuffisante ️";

  const targetMargin15Price = sellingPrice > 0
    ? (() => {
        const varRates = (settings.shopify_transaction_fee_pct + settings.payment_processing_fee_pct + settings.avg_ad_spend_pct + settings.avg_return_rate_pct * 0.1) / 100;
        const monthlyOrders = settings.avg_orders_per_month || 1;
        const shopifyPerOrder = settings.shopify_plan_monthly / monthlyOrders;
        const toolsPerOrder = (settings.ecompilot_monthly + settings.other_tools_monthly) / monthlyOrders;
        const fixedPerOrder = settings.monthly_fixed_costs / monthlyOrders;
        const fixedCosts = cost + shopifyPerOrder + settings.payment_processing_fixed + settings.avg_shipping_cost + (settings.avg_return_rate_pct / 100) * settings.avg_return_cost + toolsPerOrder + fixedPerOrder;
        return varRates < 0.85 ? (fixedCosts / (1 - varRates - 0.15 * (1 - settings.income_tax_rate_pct / 100))) : 0;
      })()
    : 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Calculateur de rentabilité
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            Marge réelle par produit après TOUS les coûts —{" "}
            <Link href="/dashboard/settings?tab=rentabilite" className="text-blue-600 underline hover:text-blue-700">
              Configurer vos coûts
            </Link>
          </p>
        </div>
        {loadingSettings && (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
            <RefreshCw className="w-4 h-4 animate-spin" /> Chargement paramètres…
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Product list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              placeholder="Rechercher un produit…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {loadingProducts ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Chargement des produits…</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-8 h-8 mx-auto mb-2" style={{ color: "#cbd5e1" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Aucun produit trouvé</p>
                <p className="text-xs mt-1" style={{ color: "#cbd5e1" }}>
                  <Link href="/dashboard/shops" className="text-blue-600 hover:underline">Connecter votre boutique Shopify</Link>
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  return (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      {asImageUrls(product.images)[0] ? (
                        <img src={asImageUrls(product.images)[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center">
                          <Package className="w-7 h-7" style={{ color: "#cbd5e1" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: isSelected ? "#2563eb" : "#0f172a" }}>
                          {product.title}
                        </p>
                        <p className="text-sm font-bold mt-0.5" style={{ color: "#2563eb" }}>
                          {parseFloat(product.price).toFixed(2)} €
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#2563eb" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Profit breakdown */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedProduct ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <Calculator className="w-12 h-12 mx-auto mb-3" style={{ color: "#cbd5e1" }} />
              <p className="text-base font-semibold" style={{ color: "var(--text-tertiary)" }}>Sélectionnez un produit</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
                Cliquez sur un produit à gauche pour voir sa rentabilité détaillée
              </p>
            </div>
          ) : (
            <>
              {/* Product header + cost input */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center gap-4 mb-4">
                  {asImageUrls(selectedProduct.images)[0] ? (
                    <img src={asImageUrls(selectedProduct.images)[0]} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      <Package className="w-7 h-7" style={{ color: "#cbd5e1" }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold truncate" style={{ color: "var(--text-primary)" }}>{selectedProduct.title}</h2>
                    <p className="text-sm font-bold mt-0.5" style={{ color: "#059669" }}>
                      Prix de vente : {sellingPrice.toFixed(2)} €
                    </p>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Prix d&apos;achat / Coût produit (€)
                    </label>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="Ex: 12.50"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                  <button
                    onClick={saveCost}
                    disabled={savingCost || !costPrice}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-sm font-semibold transition-colors"
                    style={{ color: "#fff" }}
                  >
                    <Save className="w-4 h-4" />
                    {savingCost ? "…" : "Sauvegarder"}
                  </button>
                </div>

                {cost <= 0 && (
                  <div className="mt-3 flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#d97706" }} />
                    <p className="text-xs" style={{ color: "#92400e" }}>
                      Entrez le coût produit pour un calcul précis. Configurez vos autres coûts dans{" "}
                      <Link href="/dashboard/settings?tab=rentabilite" className="font-semibold underline">Paramètres → Rentabilité</Link>.
                    </p>
                  </div>
                )}
              </div>

              {/* Waterfall breakdown */}
              {sellingPrice > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Décomposition des coûts</h3>
                  </div>
                  <div className="p-5 space-y-1.5">
                    {breakdown.map((line, i) => {
                      if (line.isSeparator) {
                        return <div key={i} className="h-px my-3" style={{ background: "#e2e8f0" }} />;
                      }
                      const isLast = line.label === "BÉNÉFICE NET";
                      const isSubtotal = line.label.startsWith("Résultat");
                      const isInfo = line.isInfo;

                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between ${isLast ? "mt-1 pt-3 border-t-2" : ""} ${isInfo ? "opacity-60" : ""}`}
                          style={isLast ? { borderColor: "#e2e8f0" } : {}}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-base flex-shrink-0">{line.icon}</span>
                            <span
                              className={`text-sm truncate ${isLast ? "font-black" : isSubtotal ? "font-bold" : "font-medium"}`}
                              style={{ color: isInfo ? "#94a3b8" : "#374151" }}
                            >
                              {line.label}
                              {isInfo && (
                                <span className="ml-1">
                                  <Info className="inline w-3 h-3" />
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span
                              className={`text-sm tabular-nums ${isLast ? "text-base font-black" : isSubtotal ? "font-bold" : "font-semibold"}`}
                              style={{
                                color: isInfo
                                  ? "#94a3b8"
                                  : line.isPositive
                                  ? "#059669"
                                  : line.amount < 0
                                  ? "#dc2626"
                                  : "#374151",
                              }}
                            >
                              {line.isPositive ? "+" : ""}
                              {line.amount.toFixed(2)} €
                            </span>
                            {!isInfo && (
                              <span
                                className="text-xs tabular-nums w-16 text-right font-medium"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {line.pct > 0 ? "+" : ""}
                                {line.pct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary cards */}
              {sellingPrice > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Net margin */}
                  <div
                    className="rounded-2xl p-4 border"
                    style={{ backgroundColor: marginBg, borderColor: marginColor + "40" }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: marginColor }}>Marge nette</p>
                    <p className="text-2xl font-black tabular-nums" style={{ color: marginColor }}>
                      {netMarginPct.toFixed(1)}%
                    </p>
                    <p className="text-xs mt-1 font-medium" style={{ color: marginColor }}>{marginLabel}</p>
                  </div>

                  {/* Break-even */}
                  <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200">
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Seuil de rentabilité</p>
                    <p className="text-2xl font-black tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {breakEvenPrice.toFixed(2)} €
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Prix minimum pour être à l&apos;équilibre</p>
                  </div>

                  {/* Recommended price for 15% margin */}
                  <div className="rounded-2xl p-4 bg-blue-50 border border-blue-200">
                    <p className="text-xs font-semibold mb-1" style={{ color: "#2563eb" }}>Prix min. pour 15%</p>
                    <p className="text-2xl font-black tabular-nums" style={{ color: "#93c5fd" }}>
                      {targetMargin15Price > 0 ? targetMargin15Price.toFixed(2) : "—"} €
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#3b82f6" }}>
                      {sellingPrice < targetMargin15Price ? (
                        <span className="flex items-center gap-1">
                          <TrendingDown className="w-3 h-3" /> Prix actuel trop bas
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Prix actuel suffisant
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Simulation */}
              {sellingPrice > 0 && netProfit !== 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>
                     Simulation mensuelle
                  </h3>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      Si je vends
                    </label>
                    <input
                      type="number"
                      value={simulationQty}
                      onChange={(e) => setSimulationQty(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      max="10000"
                      className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      style={{ color: "var(--text-primary)" }}
                    />
                    <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      unités/mois de ce produit :
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "CA total", value: (sellingPrice * simulationQty).toFixed(0) + " €", color: "#2563eb" },
                      { label: "Bénéfice net", value: (netProfit * simulationQty).toFixed(0) + " €", color: netProfit > 0 ? "#059669" : "#dc2626" },
                      { label: "Marge nette", value: netMarginPct.toFixed(1) + "%", color: marginColor },
                    ].map((item) => (
                      <div key={item.label} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                        <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                        <p className="text-lg font-black tabular-nums" style={{ color: item.color }}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
