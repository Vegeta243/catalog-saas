"use client";

import { Crown, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PlanGateProps {
  requiredPlan: "pro" | "scale";
  currentPlan?: string | null;
  children: React.ReactNode;
  feature: string;
}

export default function PlanGate({ requiredPlan, currentPlan, children, feature }: PlanGateProps) {
  const planOrder = ["starter", "pro", "scale"];
  const currentIdx = currentPlan ? planOrder.indexOf(currentPlan) : -1;
  const requiredIdx = planOrder.indexOf(requiredPlan);

  if (currentIdx >= requiredIdx) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-30 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-8 max-w-md text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-amber-50 flex items-center justify-center">
            <Crown className="w-7 h-7" style={{ color: "#d97706" }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: "#0f172a" }}>
            Fonctionnalité {requiredPlan === "scale" ? "Scale" : "Pro"}
          </h3>
          <p className="text-sm mb-6" style={{ color: "#64748b" }}>
            {feature} nécessite un abonnement {requiredPlan === "scale" ? "Scale" : "Pro"} ou supérieur.
          </p>
          <Link href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold transition-colors"
            style={{ color: "#fff" }}>
            Voir les plans <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs mt-4" style={{ color: "#94a3b8" }}>50 actions gratuites pour commencer</p>
        </div>
      </div>
    </div>
  );
}
