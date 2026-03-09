"use client";

import { useState } from "react";
import {
  X, Check, ChevronLeft, ChevronRight, Edit3, RotateCcw,
  Sparkles, Eye, CheckCircle2, XCircle, ArrowRight, RefreshCw,
} from "lucide-react";

export interface AIPreviewItem {
  id: number;
  productTitle: string;
  productImage?: string;
  original: { title?: string; description?: string; tags?: string; meta_description?: string; meta_title?: string };
  suggested: { title?: string; description?: string; tags?: string; meta_description?: string; meta_title?: string };
  accepted: boolean;
}

function CharCounter({ value, min, max, label }: { value: string; min: number; max: number; label: string }) {
  const len = (value || "").length;
  const ok = len >= min && len <= max;
  const warn = len > 0 && len < min;
  const over = len > max;
  const color = ok ? "#059669" : over ? "#dc2626" : warn ? "#d97706" : "#94a3b8";
  return (
    <span className="text-[10px] font-medium" style={{ color }}>
      {len}/{max} {ok ? "✓" : over ? "↑ trop long" : warn ? `↑ idéal ≥${min}` : ""} ({label})
    </span>
  );
}

interface AIPreviewModalProps {
  items: AIPreviewItem[];
  onApply: (items: AIPreviewItem[]) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function AIPreviewModal({ items: initialItems, onApply, onClose, loading }: AIPreviewModalProps) {
  const [items, setItems] = useState<AIPreviewItem[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const current = items[currentIndex];
  const acceptedCount = items.filter((i) => i.accepted).length;

  const toggleAccept = (id: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, accepted: !i.accepted } : i)));
  };

  const acceptAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, accepted: true })));
  };

  const rejectAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, accepted: false })));
  };

  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingField && current) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === current.id
            ? { ...i, suggested: { ...i.suggested, [editingField]: editValue } }
            : i
        )
      );
    }
    setEditingField(null);
    setEditValue("");
  };

  const revertField = (field: "title" | "description" | "tags" | "meta_description" | "meta_title") => {
    if (current) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === current.id
            ? { ...i, suggested: { ...i.suggested, [field]: i.original[field] } }
            : i
        )
      );
    }
  };

  const handleApply = () => {
    onApply(items.filter((i) => i.accepted));
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-violet-50 p-2 rounded-lg">
              <Eye className="w-5 h-5" style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: "#0f172a" }}>Aperçu des modifications IA</h3>
              <p className="text-xs" style={{ color: "#64748b" }}>
                Vérifiez et modifiez avant d&apos;appliquer — {acceptedCount}/{items.length} accepté{acceptedCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" style={{ color: "#64748b" }} />
          </button>
        </div>

        {/* Bulk actions bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button onClick={acceptAll} className="text-xs font-medium px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              style={{ color: "#059669" }}>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Tout accepter</span>
            </button>
            <button onClick={rejectAll} className="text-xs font-medium px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              style={{ color: "#dc2626" }}>
              <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Tout rejeter</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}
              className="p-1.5 hover:bg-gray-200 disabled:opacity-30 rounded-lg">
              <ChevronLeft className="w-4 h-4" style={{ color: "#374151" }} />
            </button>
            <span className="text-xs font-medium" style={{ color: "#64748b" }}>{currentIndex + 1} / {items.length}</span>
            <button onClick={() => setCurrentIndex(Math.min(items.length - 1, currentIndex + 1))} disabled={currentIndex === items.length - 1}
              className="p-1.5 hover:bg-gray-200 disabled:opacity-30 rounded-lg">
              <ChevronRight className="w-4 h-4" style={{ color: "#374151" }} />
            </button>
          </div>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Product header */}
          <div className="flex items-center gap-3 mb-5">
            {current.productImage && (
              <img src={current.productImage} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{current.productTitle}</p>
              <p className="text-xs" style={{ color: "#64748b" }}>Produit {currentIndex + 1} sur {items.length}</p>
            </div>
            <button onClick={() => toggleAccept(current.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                current.accepted
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
              style={{ color: current.accepted ? "#059669" : "#64748b" }}>
              {current.accepted ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {current.accepted ? "Accepté" : "Rejeté"}
            </button>
          </div>

          {/* Diff sections */}
          {(["meta_title", "title", "description", "tags", "meta_description"] as const).map((field) => {
            const originalVal = current.original[field];
            const suggestedVal = current.suggested[field];
            if (!suggestedVal && !originalVal) return null;
            const label = field === "title" ? "Titre produit" : field === "meta_title" ? "Meta-titre (SEO)" : field === "description" ? "Description" : field === "meta_description" ? "Meta Description" : "Tags";
            const isChanged = originalVal !== suggestedVal;
            const isEditing = editingField === field;

            return (
              <div key={field} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>{label}</p>
                  <div className="flex items-center gap-1">
                    {isChanged && (
                      <button onClick={() => revertField(field)} className="text-[10px] px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-1"
                        style={{ color: "#94a3b8" }}>
                        <RotateCcw className="w-3 h-3" /> Rétablir
                      </button>
                    )}
                    <button onClick={() => startEdit(field, suggestedVal || "")}
                      className="text-[10px] px-2 py-1 hover:bg-violet-50 rounded flex items-center gap-1"
                      style={{ color: "#7c3aed" }}>
                      <Edit3 className="w-3 h-3" /> ✏️ Modifier
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Before */}
                  <div className="p-3 rounded-lg" style={{ backgroundColor: "#f8fafc" }}>
                    <p className="text-[10px] font-medium mb-1.5 flex items-center gap-1" style={{ color: "#94a3b8" }}>
                      Avant
                    </p>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "#64748b" }}>
                      {field === "description"
                        ? (originalVal || "").replace(/<[^>]*>/g, "")
                        : originalVal || "—"}
                    </p>
                  </div>

                  {/* After */}
                  <div className={`p-3 rounded-lg border ${isChanged ? "border-violet-200 bg-violet-50/60" : "border-gray-100 bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-medium flex items-center gap-1" style={{ color: isChanged ? "#7c3aed" : "#94a3b8" }}>
                        <Sparkles className="w-3 h-3" />
                        {isChanged ? "Après IA" : "Inchangé"}
                      </p>
                      {isChanged && (field === "title" || field === "meta_title") && suggestedVal && (
                        <CharCounter value={suggestedVal} min={field === "meta_title" ? 30 : 50} max={field === "meta_title" ? 60 : 70} label={field === "meta_title" ? "SEO" : "titre"} />
                      )}
                      {isChanged && field === "meta_description" && suggestedVal && (
                        <CharCounter value={suggestedVal} min={120} max={160} label="meta" />
                      )}
                    </div>
                    {isEditing ? (
                      <div>
                        {field === "description" ? (
                          <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                            rows={4} style={{ color: "#0f172a" }} />
                        ) : (
                          <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                            style={{ color: "#0f172a" }} />
                        )}
                        <div className="flex gap-2 mt-2">
                          <button onClick={saveEdit} className="text-[10px] px-2 py-1 bg-blue-600 rounded" style={{ color: "#fff" }}>Enregistrer</button>
                          <button onClick={() => setEditingField(null)} className="text-[10px] px-2 py-1 bg-gray-100 rounded" style={{ color: "#374151" }}>Annuler</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: isChanged ? "#0f172a" : "#64748b" }}>
                        {field === "description"
                          ? (suggestedVal || "").replace(/<[^>]*>/g, "")
                          : suggestedVal || "—"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Item selector mini bar */}
          {items.length > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium mb-2" style={{ color: "#64748b" }}>Tous les produits</p>
              <div className="flex flex-wrap gap-2">
                {items.map((item, idx) => (
                  <button key={item.id} onClick={() => setCurrentIndex(idx)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      idx === currentIndex
                        ? "border-blue-400 bg-blue-50"
                        : item.accepted
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                    style={{ color: idx === currentIndex ? "#2563eb" : item.accepted ? "#059669" : "#64748b" }}>
                    {item.accepted && <Check className="w-3 h-3 inline mr-1" />}
                    {item.productTitle.substring(0, 20)}{item.productTitle.length > 20 ? "..." : ""}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50">
          <p className="text-xs" style={{ color: "#64748b" }}>
            {acceptedCount} produit{acceptedCount > 1 ? "s" : ""} sera{acceptedCount > 1 ? "ont" : ""} modifié{acceptedCount > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-lg text-sm font-medium"
              style={{ color: "#374151" }}>
              ❌ Annuler
            </button>
            <button onClick={handleApply} disabled={acceptedCount === 0 || loading}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium"
              style={{ color: "#fff" }}>
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#fff" }} />
              ) : (
                <ArrowRight className="w-4 h-4" style={{ color: "#fff" }} />
              )}
              ✅ Appliquer {acceptedCount} modification{acceptedCount > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


