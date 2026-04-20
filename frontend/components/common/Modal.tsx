import React, { useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '../icons/Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen, onClose, onConfirm, title, message,
  type = 'info', confirmText = 'Confirm', cancelText = 'Cancel', showCancel = true,
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) { document.addEventListener('keydown', handler); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = 'unset'; };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconClass = 'w-8 h-8';
  const icon = {
    success: <CheckCircleIcon className={`${iconClass} text-[var(--success)]`} />,
    warning: <ExclamationTriangleIcon className={`${iconClass} text-[var(--warning)]`} />,
    danger: <ExclamationTriangleIcon className={`${iconClass} text-[var(--danger)]`} />,
    info: <InformationCircleIcon className={`${iconClass} text-[var(--accent)]`} />,
  }[type];

  const btnColor = {
    success: 'bg-[var(--success)] hover:opacity-90',
    warning: 'bg-[var(--warning)] hover:opacity-90',
    danger: 'bg-[var(--danger)] hover:opacity-90',
    info: 'bg-[var(--accent)] hover:opacity-90',
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--bg)] border border-[var(--border)] rounded-lg max-w-sm w-full p-5 animate-scale-in">
        <button onClick={onClose} className="absolute top-3 right-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          <XMarkIcon className="w-4 h-4" />
        </button>

        <div className="mb-3">{icon}</div>
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-5">{message}</p>

        <div className="flex gap-2">
          {showCancel && (
            <button onClick={onClose} className="flex-1 px-3 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-md hover:bg-[var(--surface-hover)] transition-colors">
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 px-3 py-2.5 text-[13px] font-medium text-white rounded-md transition-opacity ${btnColor}`}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
