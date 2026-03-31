"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, Copy, Check, Share2, Users, Calendar, ChevronRight } from "lucide-react";
import { useToast } from "@/lib/toast";

interface ReferralData {
  code: string;
  referralUrl: string;
  shareText: string;
  stats: {
    total: number;
    converted: number;
    pending: number;
    rewardPerReferral: string;
    earnings: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    createdAt: string;
    convertedAt?: string;
    email: string | null;
  }>;
}

export default function ParrainagePage() {
  const { addToast } = useToast();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => { document.title = "Parrainage | EcomPilot"; }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/referral", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const copyLink = () => {
    if (!data?.referralUrl) return;
    navigator.clipboard.writeText(data.referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast("Lien copié !", "success");
    });
  };

  const shareWhatsApp = () => {
    if (!data?.referralUrl) return;
    const text = data.shareText || `Essaie EcomPilot Elite pour optimiser ton catalogue Shopify ! Utilise mon lien de parrainage → ${data.referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareEmail = () => {
    if (!data?.referralUrl) return;
    const subject = "Essaie EcomPilot Elite pour ton catalogue Shopify";
    const body = `Salut,\n\nJe voulais te recommander EcomPilot Elite, un outil super pratique pour optimiser ton catalogue Shopify. Il génère des descriptions IA, importe des produits AliExpress en 1 clic, et bien plus.\n\nUtilise mon lien de parrainage :\n${data.referralUrl}\n\nBonne chance !`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setSendingInvite(true);
    try {
      const res = await fetch("/api/referral/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Invitation envoyée !", "success");
        setInviteEmail("");
        fetchStats();
      } else {
        addToast(data.error || "Erreur", "error");
      }
    } finally {
      setSendingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Gift className="w-6 h-6 text-pink-500" />
          Programme de parrainage
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
          Parrainez des amis et obtenez <strong>-20% sur votre facture mensuelle</strong> par filleul converti — cumulable jusqu&apos;à 3 parrainages (<strong>-60% max</strong>).
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { step: 1, icon: "", title: "Partagez votre lien", desc: "Envoyez votre lien unique à vos amis" },
          { step: 2, icon: "", title: "Ils s'inscrivent", desc: "Votre filleul crée son compte avec votre lien" },
          { step: 3, icon: "", title: "Vous gagnez -20%", desc: "Dès qu'il souscrit : -20%/mois sur votre abonnement (cumulable x3)" },
        ].map(({ step, icon, title, desc }) => (
          <div key={step} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{title}</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Filleuls invités", value: data?.stats.total ?? 0, color: "#3b82f6" },
          { label: "Convertis", value: data?.stats.converted ?? 0, color: "#10b981" },
          { label: "Réduction obtenue", value: `${Math.min((data?.stats.converted ?? 0) * 20, 60)}%`, color: "#f59e0b" },
          { label: "Gains accumulés", value: `${data?.stats.earnings ?? 0}€`, color: "#8b5cf6" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Votre lien de parrainage</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl text-sm font-mono truncate border border-gray-200" style={{ color: "var(--text-secondary)" }}>
            {data?.referralUrl || "Chargement…"}
          </div>
          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition-colors flex-shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={shareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-green-50 border-green-200 text-green-700">
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button onClick={shareEmail}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-blue-50 border-blue-200 text-blue-700">
            <Share2 className="w-4 h-4" /> Email
          </button>
        </div>
      </div>

      {/* Invite by email */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Inviter directement par email</h2>
        <div className="flex gap-2">
          <input
            type="email" value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendInvite()}
            placeholder="ami@exemple.com"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            style={{ color: "var(--text-primary)" }}
          />
          <button onClick={sendInvite} disabled={sendingInvite || !inviteEmail}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-sm font-medium text-white transition-colors">
            <ChevronRight className="w-4 h-4" /> Envoyer
          </button>
        </div>
      </div>

      {/* Referral code badge */}
      {data?.code && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Votre code parrainage</h2>
          <div className="inline-flex items-center gap-3">
            <span className="px-5 py-2 bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl text-xl font-extrabold font-mono tracking-widest" style={{ color: "#1d4ed8" }}>
              {data.code}
            </span>
            <span className="text-xs text-slate-500">Ce code est inclus automatiquement dans votre lien.</span>
          </div>
        </div>
      )}

      {/* Referral list */}
      {data?.referrals && data.referrals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Users className="w-4 h-4" /> Mes filleuls ({data.referrals.length})
          </h2>
          <div className="space-y-2">
            {data.referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {r.email || 'Inscrit via votre lien'}
                  </p>
                  <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    <Calendar className="w-3 h-3" />
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === "converted"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {r.status === "converted" ? "✓ Converti" : "⏳ En attente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
