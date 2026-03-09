"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Link2, FileSpreadsheet, CheckCircle2, XCircle, RefreshCw, Package, ArrowRight, X, ImageOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";

interface ImportPreview {
  title: string;
  description: string;
  imageUrl: string;
  supplierPrice: number;
  sellingPrice: string;
  margin: number;
  note?: string;
}

interface ImportResult {
  url: string;
  status: "pending" | "scraping" | "preview" | "importing" | "done" | "error";
  preview?: ImportPreview;
  isDemo?: boolean;
  error?: string;
}

export default function ImportPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"url" | "csv">("url");
  const [urls, setUrls] = useState("");
  const [margin, setMargin] = useState("2.5");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [hasShop, setHasShop] = useState<boolean | null>(null);

  // Check if user has a connected shop
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHasShop(false); return; }
        const { data } = await supabase
          .from("shops")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1);
        setHasShop(!!(data && data.length > 0));
      } catch {
        setHasShop(false);
      }
    })();
  }, []);

  const handleScrape = async () => {
    const urlList = urls.split("\n").map((u) => u.trim()).filter(Boolean).slice(0, 20);
    if (urlList.length === 0) return;

    setResults(urlList.map((url) => ({ url, status: "pending" })));
    setImporting(true);

    await Promise.all(urlList.map(async (url, i) => {
      setResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "scraping" } : r));

      try {
        const res = await fetch("/api/import/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, margin: parseFloat(margin) }),
        });

        if (!res.ok) throw new Error("Échec du scraping");
        const data = await res.json();

        setResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "preview", preview: data.preview, isDemo: data.demo === true } : r));
      } catch {
        setResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: "Impossible de charger cette URL" } : r));
      }
    }));
    setImporting(false);
  };

  const handleImportAll = async () => {
    const toImport = results.filter((r) => r.status === "preview" && r.preview);
    if (toImport.length === 0) return;

    setImporting(true);

    // Mark as importing
    setResults((prev) => prev.map((r) => r.status === "preview" ? { ...r, status: "importing" } : r));

    try {
      const res = await fetch("/api/import/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: toImport.map((r) => ({
            title: r.preview!.title,
            description: r.preview!.description,
            imageUrl: r.preview!.imageUrl,
            price: r.preview!.sellingPrice,
          })),
        }),
      });

      if (!res.ok) throw new Error("Erreur d'import");
      const data = await res.json();

      if (data.error) {
        // API returned a specific error (e.g. no shop connected)
        setResults((prev) => prev.map((r) =>
          r.status === "importing" ? { ...r, status: "error", error: data.error } : r
        ));
        addToast(data.error, "error");
      } else {
        setResults((prev) => prev.map((r) => {
          if (r.status === "importing") {
            const match = data.results?.find((dr: { title: string; success: boolean }) => dr.title === r.preview?.title);
            return { ...r, status: match?.success ? "done" : "error", error: match?.error };
          }
          return r;
        }));

        const succeeded = data.summary?.succeeded || 0;
        addToast(
          `✅ ${succeeded} produit${succeeded > 1 ? "s" : ""} importé${succeeded > 1 ? "s" : ""} en brouillon — publiez-les dans le catalogue quand vous êtes prêt`,
          "success"
        );
      }
    } catch (err) {
      const errorMsg = hasShop === false ? "Boutique non connectée — connectez votre boutique dans Mes boutiques" : "Erreur réseau — vérifiez votre connexion";
      setResults((prev) => prev.map((r) => r.status === "importing" ? { ...r, status: "error", error: errorMsg } : r));
      addToast(errorMsg, "error");
    }

    setImporting(false);
  };

  const handleCSVImport = async () => {
    if (!csvFile) return;
    setImporting(true);

    try {
      const text = await csvFile.text();
      const lines = text.split("\n").slice(1).filter(Boolean);
      const products = lines.map((line) => {
        const cols = line.split(",").map((c) => c.replace(/"/g, "").trim());
        return { title: cols[0] || "Sans titre", price: cols[1] || "0", description: cols[2] || "", imageUrl: cols[3] || "" };
      });

      const res = await fetch("/api/import/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      addToast(`${data.summary?.succeeded || 0} produit${(data.summary?.succeeded || 0) > 1 ? "s" : ""} importé${(data.summary?.succeeded || 0) > 1 ? "s" : ""} depuis CSV`, "success");
    } catch {
      addToast("Erreur lors de l'import CSV", "error");
    }

    setImporting(false);
  };

  const readyCount = results.filter((r) => r.status === "preview").length;
  const doneCount = results.filter((r) => r.status === "done").length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Importer des produits</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Ajoutez des produits depuis une URL ou un fichier CSV</p>
      </div>

      {/* Tabs */}
      {hasShop === false && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 mb-4" style={{ backgroundColor: "#fffbeb" }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#92400e" }}>Aucune boutique connectée</p>
            <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>
              Vous pouvez analyser les URLs, mais l&apos;import vers Shopify nécessite une boutique connectée.{" "}
              <a href="/dashboard/shops" className="underline font-medium">Connecter une boutique →</a>
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab("url")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${activeTab === "url" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`} style={{ color: activeTab === "url" ? "#0f172a" : "#64748b" }}>
          <Link2 className="w-4 h-4" /> Depuis une URL
        </button>
        <button onClick={() => setActiveTab("csv")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${activeTab === "csv" ? "bg-white shadow-sm" : "hover:bg-gray-200"}`} style={{ color: activeTab === "csv" ? "#0f172a" : "#64748b" }}>
          <FileSpreadsheet className="w-4 h-4" /> Import CSV
        </button>
      </div>

      {activeTab === "url" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold mb-1" style={{ color: "#0f172a" }}>Collez vos URLs (une par ligne, max 20)</h2>
            <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Compatible AliExpress, CJ Dropshipping, et toute page produit</p>
            <p className="text-xs mb-4 flex items-center gap-1" style={{ color: "#d97706" }}>
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              CJ Dropshipping et AliExpress utilisent du JS rendu côté client — des données de démonstration seront utilisées si le scraping échoue.
            </p>
            <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={5}
              placeholder={"https://www.aliexpress.com/item/...\nhttps://cjdropshipping.com/product/..."}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              style={{ color: "#0f172a" }} />
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium" style={{ color: "#374151" }}>Marge ×</label>
                <input type="number" value={margin} onChange={(e) => setMargin(e.target.value)} step="0.1" min="1"
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
              </div>
              <button onClick={handleScrape} disabled={importing || !urls.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium ml-auto">
                {importing ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Upload className="w-4 h-4" style={{ color: "#fff" }} />}
                <span style={{ color: "#fff" }}>Analyser les URLs</span>
              </button>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                  {doneCount > 0 ? `${doneCount}/${results.length} importés` : `${readyCount} produit${readyCount > 1 ? "s" : ""} prêt${readyCount > 1 ? "s" : ""}`}
                </p>
                {readyCount > 0 && (
                  <button onClick={handleImportAll} disabled={importing}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                    {importing ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <ArrowRight className="w-4 h-4" style={{ color: "#fff" }} />}
                    <span style={{ color: "#fff" }}>Importer {readyCount} produit{readyCount > 1 ? "s" : ""}</span>
                  </button>
                )}
              </div>

              {results.map((r, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4">
                  {/* Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                    {r.preview?.imageUrl ? (
                      <img
                        src={r.preview.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : <ImageOff className="w-6 h-6" style={{ color: "#cbd5e1" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>{r.preview?.title || r.url}</p>
                        {r.isDemo && (
                          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mb-1" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                            DEMO — données illustratives
                          </span>
                        )}
                        {r.preview && (
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs" style={{ color: "#94a3b8" }}>Fournisseur: {r.preview.supplierPrice.toFixed(2)}€</span>
                            <span className="text-xs font-semibold" style={{ color: "#059669" }}>Vente: {r.preview.sellingPrice}€</span>
                            <span className="text-xs" style={{ color: "#64748b" }}>×{r.preview.margin}</span>
                          </div>
                        )}
                        {r.error && <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{r.error}</p>}
                      </div>
                      <div className="flex-shrink-0">
                        {r.status === "pending" && <span className="text-xs px-2 py-1 bg-gray-100 rounded-full" style={{ color: "#64748b" }}>En attente</span>}
                        {r.status === "scraping" && <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 rounded-full" style={{ color: "#2563eb" }}><RefreshCw className="w-3 h-3 animate-spin" /> Analyse...</span>}
                        {r.status === "preview" && <span className="text-xs px-2 py-1 bg-amber-50 rounded-full" style={{ color: "#d97706" }}>Prêt</span>}
                        {r.status === "importing" && <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 rounded-full" style={{ color: "#2563eb" }}><RefreshCw className="w-3 h-3 animate-spin" /> Import...</span>}
                        {r.status === "done" && <span className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-50 rounded-full" style={{ color: "#059669" }}><CheckCircle2 className="w-3 h-3" /> Importé</span>}
                        {r.status === "error" && <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 rounded-full" style={{ color: "#dc2626" }}><XCircle className="w-3 h-3" /> Échec</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "csv" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold mb-1" style={{ color: "#0f172a" }}>Import depuis un fichier CSV</h2>
          <p className="text-xs mb-4" style={{ color: "#94a3b8" }}>Colonnes attendues : titre, prix, description, image_url</p>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 transition-all"
            onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet className="w-10 h-10 mx-auto mb-3" style={{ color: "#94a3b8" }} />
            <p className="text-sm font-medium" style={{ color: "#374151" }}>{csvFile ? csvFile.name : "Cliquez pour sélectionner un fichier CSV"}</p>
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>ou glissez-déposez ici</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
          </div>

          {csvFile && (
            <button onClick={handleCSVImport} disabled={importing}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
              {importing ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Upload className="w-4 h-4" style={{ color: "#fff" }} />}
              <span style={{ color: "#fff" }}>Importer le CSV</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
