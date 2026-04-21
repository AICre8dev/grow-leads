import React from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { Toast as ToastType } from '../types';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const icons = {
    success: <CheckCircle size={16} className="text-green-400" />,
    error: <XCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-blue-400" />,
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-grow-card border border-grow-border shadow-2xl min-w-[280px] max-w-[380px] ${
        toast.exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
      }`}
    >
      {icons[toast.type]}
      <span className="text-sm text-grow-text flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-grow-text-muted hover:text-grow-text-secondary transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
