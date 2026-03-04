"use client";

import { useState, useEffect } from "react";
import { Cookie, X, Settings } from "lucide-react";
import Link from "next/link";

type CookieConsent = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_KEY = "ecompilot_cookie_consent";

function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(COOKIE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveCookieConsent(consent: CookieConsent) {
  localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const existing = getCookieConsent();
    if (!existing) {
      // Delay to avoid flash
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const fullConsent: CookieConsent = { essential: true, analytics: true, marketing: true };
    saveCookieConsent(fullConsent);
    setVisible(false);
  };

  const handleRejectAll = () => {
    const minConsent: CookieConsent = { essential: true, analytics: false, marketing: false };
    saveCookieConsent(minConsent);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    saveCookieConsent({ ...consent, essential: true });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Main banner */}
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Cookie className="w-5 h-5" style={{ color: "#d97706" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1" style={{ color: "#0f172a" }}>
                Ce site utilise des cookies
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                Nous utilisons des cookies essentiels pour le fonctionnement du site et, avec votre consentement,
                des cookies analytiques pour améliorer nos services. Pour en savoir plus, consultez notre{" "}
                <Link href="/politique-confidentialite" className="underline" style={{ color: "#2563eb" }}>
                  politique de confidentialité
                </Link>.
              </p>
            </div>
            <button
              onClick={handleRejectAll}
              className="p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Fermer"
            >
              <X className="w-4 h-4" style={{ color: "#94a3b8" }} />
            </button>
          </div>

          {/* Detail panel */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#0f172a" }}>Cookies essentiels</p>
                  <p className="text-[11px]" style={{ color: "#94a3b8" }}>Nécessaires au fonctionnement (authentification, session)</p>
                </div>
                <div className="w-9 h-5 rounded-full flex items-center cursor-not-allowed" style={{ backgroundColor: "#2563eb" }}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm ml-auto mr-0.5" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#0f172a" }}>Cookies analytiques</p>
                  <p className="text-[11px]" style={{ color: "#94a3b8" }}>Mesure d&apos;audience et amélioration du service</p>
                </div>
                <button
                  onClick={() => setConsent((c) => ({ ...c, analytics: !c.analytics }))}
                  className="w-9 h-5 rounded-full flex items-center transition-colors"
                  style={{ backgroundColor: consent.analytics ? "#2563eb" : "#d1d5db" }}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                    style={{ transform: consent.analytics ? "translateX(16px)" : "translateX(2px)" }}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#0f172a" }}>Cookies marketing</p>
                  <p className="text-[11px]" style={{ color: "#94a3b8" }}>Publicité ciblée et suivi intersite</p>
                </div>
                <button
                  onClick={() => setConsent((c) => ({ ...c, marketing: !c.marketing }))}
                  className="w-9 h-5 rounded-full flex items-center transition-colors"
                  style={{ backgroundColor: consent.marketing ? "#2563eb" : "#d1d5db" }}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                    style={{ transform: consent.marketing ? "translateX(16px)" : "translateX(2px)" }}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleAcceptAll}
              className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: "#2563eb" }}
            >
              Tout accepter
            </button>
            <button
              onClick={handleRejectAll}
              className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
              style={{ color: "#374151" }}
            >
              Tout refuser
            </button>
            {showDetails ? (
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
                style={{ color: "#374151" }}
              >
                Enregistrer
              </button>
            ) : (
              <button
                onClick={() => setShowDetails(true)}
                className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                title="Personnaliser"
              >
                <Settings className="w-4 h-4" style={{ color: "#64748b" }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
