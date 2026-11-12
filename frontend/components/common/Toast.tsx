import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '../icons/Icons';

type Tone = 'success' | 'error';
interface ToastState { id: number; tone: Tone; text: string }

/** Small result message for actions (saved, sent, failed). Announced politely to screen readers. */
export const useToast = () => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((text: string, tone: Tone = 'success') => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), tone, text });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, show, dismiss: () => setToast(null) };
};

export const Toast: React.FC<{ toast: ToastState | null; onDismiss: () => void }> = ({ toast, onDismiss }) => (
  <div aria-live="polite" role="status" className="fixed z-[400] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px] pointer-events-none">
    {toast && (
      <div key={toast.id} className="pointer-events-auto flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow-lg)] px-4 py-3 animate-slide-up">
        {toast.tone === 'success'
          ? <CheckCircleIcon className="w-5 h-5 shrink-0 text-[var(--success)]" />
          : <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-[var(--danger)]" />}
        <p className="flex-1 text-[14px] text-[var(--text-primary)] leading-snug">{toast.text}</p>
        <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 -m-1 p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-ring">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
);
