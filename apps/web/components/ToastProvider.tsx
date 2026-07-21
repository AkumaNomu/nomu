"use client";

import { createContext, useCallback, useContext, useState } from "react";
import styles from "./ToastProvider.module.css";

type Toast = { id: number; message: string; tone: "success" | "error" };
const ToastContext = createContext<{ showToast: (message: string, tone?: Toast["tone"]) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600);
  }, []);
  return <ToastContext.Provider value={{ showToast }}>{children}<div className={styles.stack} aria-live="polite">{toasts.map((toast) => <div className={styles.toast} data-tone={toast.tone} key={toast.id}>{toast.message}</div>)}</div></ToastContext.Provider>;
}

export function useToasts() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToasts must be used within ToastProvider");
  return value;
}
