"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap } from "lucide-react";

/**
 * Entry point for Shopify Admin embedded app.
 * Shopify opens this URL inside their iframe after OAuth.
 * We detect the `host` + `shop` params and initialize App Bridge.
 */
export default function ShopifyEmbedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const shop = searchParams.get("shop");
  const host = searchParams.get("host"); // base64 host param from Shopify
  const error = searchParams.get("error");

  useEffect(() => {
    if (error) {
      const messages: Record<string, string> = {
        missing_params: "Paramètres OAuth manquants.",
        csrf: "Erreur de sécurité (CSRF). Réessayez l'installation.",
        shop_mismatch: "La boutique ne correspond pas. Réessayez.",
        invalid_hmac: "Signature invalide. Réessayez l'installation.",
        token_exchange: "Échange de token échoué. Réessayez.",
        no_token: "Aucun token reçu. Réessayez.",
      };
      setErrorMsg(messages[error] || "Erreur inconnue lors de l'installation.");
      setStatus("error");
      return;
    }

    if (!shop) {
      // No shop param — redirect to connection page
      router.replace("/dashboard/connect");
      return;
    }

    if (!host) {
      // No host param — not in embedded context, redirect to dashboard
      router.replace("/dashboard");
      return;
    }

    // Dynamically load Shopify App Bridge (CDN approach, no npm install needed)
    // App Bridge v3 is loaded from Shopify's CDN when running inside admin
    const script = document.createElement("script");
    script.src = "https://cdn.shopify.com/shopifycloud/app-bridge.js";
    script.dataset.apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "";
    script.onload = () => {
      setStatus("ok");
      // Once App Bridge is loaded, redirect to the embedded dashboard
      router.replace(`/dashboard?shop=${shop}&host=${host}&embedded=1`);
    };
    script.onerror = () => {
      // App Bridge failed to load — still redirect to dashboard
      setStatus("ok");
      router.replace(`/dashboard?shop=${shop}`);
    };
    document.head.appendChild(script);

    return () => {
      try { document.head.removeChild(script); } catch { /* ignore */ }
    };
  }, [shop, host, error, router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-lg font-bold mb-2" style={{ color: "#0f172a" }}>Erreur d&apos;installation</h1>
          <p className="text-sm mb-4" style={{ color: "#64748b" }}>{errorMsg}</p>
          <a
            href="/api/auth/shopify"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold"
            style={{ color: "#fff" }}
          >
            Réessayer l&apos;installation
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Zap className="w-6 h-6" style={{ color: "#fff" }} />
        </div>
        <p className="text-sm font-medium" style={{ color: "#475569" }}>
          {shop ? `Connexion à ${shop}…` : "Initialisation EcomPilot…"}
        </p>
        <div className="mt-3 flex items-center justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
