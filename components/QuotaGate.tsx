"use client";

import { AlertTriangle, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { PLAN_TASKS } from "@/lib/credits";

interface QuotaGateProps {
  plan: string;
  tasksUsed: number;
  children: React.ReactNode;
}

/**
 * QuotaGate — wraps any action area and blocks interaction when user reaches
 * their plan's task quota. Shows an upgrade prompt overlay.
 * Works for ALL plans including free, starter, pro, scale.
 */
export default function QuotaGate({ plan, tasksUsed, children }: QuotaGateProps) {
  const tasksTotal = PLAN_TASKS[plan] || PLAN_TASKS.free || 50;
  const remaining = Math.max(0, tasksTotal - tasksUsed);

  if (remaining > 0) {
    return <>{children}</>;
  }

  // Determine upgrade target
  const planOrder = ["free", "starter", "pro", "agency", "scale"];
  const currentIdx = planOrder.indexOf(plan);
  const nextPlan = currentIdx < planOrder.length - 1 ? planOrder[currentIdx + 1] : null;
  const nextPlanName = nextPlan
    ? nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1)
    : null;

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-20 blur-[3px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-2xl p-8 max-w-md text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" style={{ color: "#d97706" }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: "#0f172a" }}>
            Quota atteint
          </h3>
          <p className="text-sm mb-2" style={{ color: "#64748b" }}>
            Vous avez utilisé {tasksUsed}/{tasksTotal} actions de votre plan{" "}
            <span className="font-semibold capitalize">{plan}</span>.
          </p>
          {nextPlan ? (
            <>
              <p className="text-sm mb-6" style={{ color: "#64748b" }}>
                Passez au plan <span className="font-bold" style={{ color: "#2563eb" }}>{nextPlanName}</span> pour
                débloquer {PLAN_TASKS[nextPlan]?.toLocaleString("fr-FR")} actions/mois.
              </p>
              <Link href={`/dashboard/upgrade?autocheckout=${nextPlan}&billing=monthly`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold transition-colors"
                style={{ color: "#fff" }}>
                <Zap className="w-4 h-4" /> Passer au plan {nextPlanName} <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <p className="text-sm mb-6" style={{ color: "#64748b" }}>
              Vous êtes sur le plan maximum. Contactez-nous pour un plan personnalisé.
            </p>
          )}
          <p className="text-xs mt-4" style={{ color: "#94a3b8" }}>
            Vos données restent intactes. Renouvellement automatique chaque mois.
          </p>
        </div>
      </div>
    </div>
  );
}
