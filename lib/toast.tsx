"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { CheckCircle2, XCircle, X, Info } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  addToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm animate-slide-in dark:border-opacity-50 ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/80 dark:border-emerald-700"
                : toast.type === "error"
                ? "bg-red-50 border-red-200 dark:bg-red-900/80 dark:border-red-700"
                : "bg-blue-50 border-blue-200 dark:bg-blue-900/80 dark:border-blue-700"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#059669" }} />}
            {toast.type === "error" && <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#dc2626" }} />}
            {toast.type === "info" && <Info className="w-5 h-5 flex-shrink-0" style={{ color: "#2563eb" }} />}
            <p className="text-sm font-medium flex-1" style={{ color: toast.type === "success" ? "#065f46" : toast.type === "error" ? "#991b1b" : "#1e40af" }}>
              {toast.message}
            </p>
            <button onClick={() => removeToast(toast.id)} className="p-0.5 hover:bg-black/5 rounded">
              <X className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
