"use client";

import { X, Zap, Crown, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ActionsLimitModalProps {
  show: boolean;
  onClose: () => void;
  used: number;
  limit: number;
}

const PLANS = [
  {
    name: "Starter",
    price: "29€",
    period: "/mois",
    actions: "500 actions/mois",
    features: ["Automatisations avancées", "Calendrier éditorial", "Support prioritaire"],
    href: "/dashboard/upgrade?plan=starter",
    color: "#0ea5e9",
    badge: null,
  },
  {
    name: "Pro",
    price: "79€",
    period: "/mois",
    actions: "5 000 actions/mois",
    features: ["Tout Starter inclus", "Analyse concurrence", "API access", "5 boutiques"],
    href: "/dashboard/upgrade?plan=pro",
    color: "#7c3aed",
    badge: "Populaire",
  },
] as const;

export function ActionsLimitModal({ show, onClose, used, limit }: ActionsLimitModalProps) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.6)",
        zIndex: 10001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "32px",
          maxWidth: "560px",
          width: "100%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Zap style={{ width: "18px", height: "18px", color: "#d97706" }} />
              </div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Quota d&apos;actions atteint
              </h2>
            </div>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
              Vous avez utilisé <strong style={{ color: "#0f172a" }}>{used}/{limit}</strong> actions ce mois-ci.
              Passez à un plan supérieur pour continuer.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px", borderRadius: "6px", display: "flex" }}
          >
            <X style={{ width: "20px", height: "20px" }} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ background: "#f1f5f9", borderRadius: "9999px", height: "8px", marginBottom: "28px", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: "9999px", background: "linear-gradient(90deg, #f59e0b, #ef4444)", width: "100%" }} />
        </div>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {PLANS.map((plan) => (
            <Link
              key={plan.name}
              href={plan.href}
              onClick={onClose}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                border: `2px solid ${plan.color}20`,
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                transition: "border-color 0.2s",
                position: "relative",
                background: `${plan.color}06`,
              }}>
                {plan.badge && (
                  <span style={{ position: "absolute", top: "-10px", right: "12px", background: plan.color, color: "#fff", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "9999px" }}>
                    {plan.badge}
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <Crown style={{ width: "16px", height: "16px", color: plan.color }} />
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{plan.name}</span>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <span style={{ fontSize: "22px", fontWeight: 800, color: plan.color }}>{plan.price}</span>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>{plan.period}</span>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: plan.color, marginBottom: "8px" }}>{plan.actions}</div>
                {plan.features.map((f) => (
                  <div key={f} style={{ fontSize: "12px", color: "#475569", marginBottom: "3px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ color: plan.color, fontWeight: 700 }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "13px", cursor: "pointer", padding: "8px" }}
          >
            Plus tard
          </button>
          <Link href="/pricing" onClick={onClose} style={{ textDecoration: "none" }}>
            <button style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "linear-gradient(135deg, #7c3aed, #0ea5e9)",
              color: "#fff", border: "none", borderRadius: "10px",
              padding: "10px 20px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
            }}>
              Voir tous les plans
              <ArrowRight style={{ width: "14px", height: "14px" }} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
