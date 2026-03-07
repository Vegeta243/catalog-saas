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
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border animate-slide-in ${
              toast.type === "success"
                ? "bg-white dark:bg-[#0a1e18] border-emerald-200 dark:border-emerald-800/60"
                : toast.type === "error"
                ? "bg-white dark:bg-[#1a0b0b] border-red-200 dark:border-red-800/60"
                : "bg-white dark:bg-[#090f1e] border-blue-200 dark:border-blue-800/60"
            }`}
            style={{
              boxShadow: "0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)"
            }}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />}
            {toast.type === "error"   && <XCircle       className="w-5 h-5 flex-shrink-0 text-red-500"     />}
            {toast.type === "info"    && <Info           className="w-5 h-5 flex-shrink-0 text-blue-500"    />}
            <p className={`text-sm font-medium flex-1 leading-snug ${
              toast.type === "success" ? "text-emerald-800 dark:text-emerald-300"
              : toast.type === "error" ? "text-red-800 dark:text-red-300"
              : "text-blue-800 dark:text-blue-300"
            }`}>
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
