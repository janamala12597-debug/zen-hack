import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface AndroidToastData {
  id: string;
  message: string;
  type?: 'success' | 'warning' | 'info';
  actionLabel?: string;
  onAction?: () => void;
}

let toastListener: ((toast: AndroidToastData) => void) | null = null;

export function showAndroidToast(
  message: string, 
  type: 'success' | 'warning' | 'info' = 'success',
  actionLabel?: string,
  onAction?: () => void
) {
  if (toastListener) {
    toastListener({
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
      actionLabel,
      onAction,
    });
  }
}

export const AndroidSnackbar: React.FC = () => {
  const [toast, setToast] = useState<AndroidToastData | null>(null);

  useEffect(() => {
    toastListener = (newToast) => {
      // Trigger haptic feedback if available on device
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(20);
        } catch (e) {}
      }

      setToast(newToast);
      const timer = setTimeout(() => {
        setToast((current) => (current?.id === newToast.id ? null : current));
      }, 4000);
      return () => clearTimeout(timer);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[90vw] animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-slate-900/95 text-white px-4 py-2.5 rounded-full shadow-xl backdrop-blur-md border border-slate-700/60 flex items-center gap-3 text-xs font-medium">
        {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
        {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
        
        <span className="truncate">{toast.message}</span>

        {toast.actionLabel && toast.onAction && (
          <button
            onClick={() => {
              toast.onAction?.();
              setToast(null);
            }}
            className="text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider text-[11px] ml-1 shrink-0"
          >
            {toast.actionLabel}
          </button>
        )}

        <button
          onClick={() => setToast(null)}
          className="text-slate-400 hover:text-white ml-1 p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
