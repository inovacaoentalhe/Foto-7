
import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { icon: <CheckCircle className="w-4 h-4" />, className: 'bg-emerald-950 border-emerald-500 text-emerald-100 shadow-emerald-500/20' },
    error: { icon: <AlertCircle className="w-4 h-4" />, className: 'bg-red-950 border-red-500 text-red-100 shadow-red-500/20' },
    warning: { icon: <AlertTriangle className="w-4 h-4" />, className: 'bg-amber-950 border-amber-500 text-amber-100 shadow-amber-500/20' },
    info: { icon: <Info className="w-4 h-4" />, className: 'bg-blue-950 border-blue-500 text-blue-100 shadow-blue-500/20' }
  };

  const { icon, className } = config[type];

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl animate-slide-in max-w-sm ${className}`}>
      <div className="shrink-0">{icon}</div>
      <p className="font-bold text-[11px] uppercase tracking-wide flex-1">{message}</p>
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
    </div>
  );
};
