"use client";
import { useState } from "react";

export function ImpersonateButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  const handleImpersonate = async () => {
    if (!confirm("Ouvrir une session en tant que cet utilisateur ?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        alert(data.error || "Impossible de générer le lien");
      }
    } catch {
      alert("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleImpersonate}
      disabled={loading}
      title="Impersonate user"
      className="text-[10px] px-2 py-1 border border-blue-200 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50 transition-colors"
    >
      {loading ? "⏳" : "👤"}
    </button>
  );
}
