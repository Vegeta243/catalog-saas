"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

export default function AccountRecoveryPage() {
  const router = useRouter();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("users")
        .select("deleted_at, deletion_scheduled_at")
        .eq("id", user.id)
        .single();

      if (!data?.deleted_at) {
        router.push("/dashboard");
        return;
      }

      if (data.deletion_scheduled_at) {
        const scheduled = new Date(data.deletion_scheduled_at).getTime();
        const now = Date.now();
        const days = Math.max(0, Math.ceil((scheduled - now) / (1000 * 60 * 60 * 24)));
        setDaysLeft(days);
      }
      setLoading(false);
    };
    checkStatus();
  }, [router]);

  const handleRecover = async () => {
    setRecovering(true);
    try {
      const res = await fetch("/api/user/recover", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
      }
    } catch {
      setRecovering(false);
    }
  };

  const handleHardDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE_NOW" }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/login");
      }
    } catch {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Votre compte a été marqué pour suppression
        </h1>

        {daysLeft !== null && (
          <p className="text-gray-600 mb-6">
            Suppression définitive dans{" "}
            <span className="font-bold text-orange-600">{daysLeft} jour{daysLeft !== 1 ? "s" : ""}</span>
          </p>
        )}

        <p className="text-sm text-gray-500 mb-8">
          Vous pouvez récupérer votre compte et retrouver toutes vos données, 
          ou confirmer la suppression immédiate et définitive.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleRecover}
            disabled={recovering}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${recovering ? "animate-spin" : ""}`} />
            {recovering ? "Récupération..." : "Récupérer mon compte"}
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Confirmer la suppression définitive
            </button>
          ) : (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-700 mb-3">
                Cette action est irréversible. Toutes vos données seront supprimées.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleHardDelete}
                  disabled={deleting}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
