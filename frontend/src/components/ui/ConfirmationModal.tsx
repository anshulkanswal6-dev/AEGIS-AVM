import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

export function ConfirmationModal({ 
  isOpen, onClose, onConfirm, 
  title, message, 
  confirmText = "Confirm", cancelText = "Cancel",
  variant = 'default'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative th-surface-elevated border border-[var(--th-border-strong)] rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 fade-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 p-1 th-text-tertiary hover:th-text transition-colors">
           <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-4 mb-8">
           <div className={cn(
             "w-12 h-12 rounded-xl flex items-center justify-center shadow-md",
             variant === 'danger' ? "bg-rose-500 text-white" : "bg-blue-950 text-white"
           )}>
             {variant === 'danger' ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
           </div>
           <div className="space-y-1">
              <h3 className="text-lg font-bold th-text">{title}</h3>
              <p className="text-xs th-text-secondary font-medium">{message}</p>
           </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-[var(--th-border-strong)] th-text-secondary hover:th-text hover:th-surface-hover text-xs font-bold uppercase tracking-widest transition-all"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={cn(
              "flex-1 h-11 rounded-xl text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg",
              variant === 'danger' ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" : "bg-blue-950 hover:bg-blue-900 shadow-blue-950/20"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
