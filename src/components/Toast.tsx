import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-550 flex flex-col gap-3 min-w-[280px] max-w-[360px] pointer-events-none">
      {toasts.map((toast) => {
        let bgColor = 'bg-slate-900 text-slate-100 border-slate-800';
        let icon = <Info className="h-5 w-5 text-blue-400 shrink-0" />;

        if (toast.type === 'success') {
          bgColor = 'bg-white border-emerald-100 text-emerald-950 shadow-md shadow-emerald-500/5';
          icon = <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />;
        } else if (toast.type === 'error') {
          bgColor = 'bg-white border-red-100 text-red-950 shadow-md shadow-red-500/5';
          icon = <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />;
        } else if (toast.type === 'info') {
          bgColor = 'bg-white border-rose-100 text-slate-850 shadow-md shadow-rose-500/5';
          icon = <Info className="h-5 w-5 text-rose-500 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${bgColor} transform transition-all duration-300 animate-slide-in-right relative`}
          >
            {icon}
            <div className="flex-1 text-xs sm:text-sm font-semibold pr-3 font-sans">
              {toast.message}
            </div>
            <button
              onClick={() => onClose(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
