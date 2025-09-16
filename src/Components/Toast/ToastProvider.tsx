import * as React from 'react';
import { createPortal } from 'react-dom';
import styles from './toast.module.css';
import type { Toast, ToastKind } from '../../Models/toast';




type ToastContextValue = {
  show: (message: string, kind?: ToastKind, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);
export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const remove = (id: string) => setToasts(ts => ts.filter(t => t.id !== id));

  const push = React.useCallback((message: string, kind: ToastKind = 'info', duration = 3500) => {
    const id = crypto.randomUUID?.() ?? String(Date.now() + Math.random());
    const toast: Toast = { id, kind, message, duration };
    setToasts(ts => [...ts, toast]);
    // autocierre
    window.setTimeout(() => remove(id), duration);
  }, []);

  const value: ToastContextValue = React.useMemo(() => ({
    show: (m, k = 'info', d = 3500) => push(m, k, d),
    success: (m, d = 3500) => push(m, 'success', d),
    error: (m, d = 4500) => push(m, 'error', d),
    info: (m, d = 3500) => push(m, 'info', d),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className={styles.container}>
          {toasts.map(t => (
            <div
              key={t.id}
              className={`${styles.toast} ${styles[t.kind]}`}
              onMouseEnter={() => remove(t.id)} /* opcional: cerrar al hover */
              role="status" aria-live="polite"
            >
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
