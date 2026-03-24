import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance | EcomPilot Elite",
  robots: "noindex, nofollow",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <div className="text-center px-6 max-w-md">
        <div className="text-6xl mb-6">🔧</div>
        <h1 className="text-3xl font-bold text-white mb-3">
          Maintenance en cours
        </h1>
        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
          EcomPilot Elite est temporairement indisponible pour une mise à jour.
          <br />
          Nous serons de retour très bientôt.
        </p>
        <div className="inline-flex items-center gap-2 text-sm text-slate-500 bg-slate-800 rounded-full px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Retour prévu dans quelques minutes
        </div>
        <p className="mt-8 text-xs text-slate-600">
          Questions ?{" "}
          <a
            href="mailto:contact@ecompilotelite.com"
            className="text-slate-400 hover:text-white underline transition-colors"
          >
            contact@ecompilotelite.com
          </a>
        </p>
      </div>
    </div>
  );
}
