import { useState, createContext, useContext, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

const icons = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

const colors = {
  success: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46', icon: '#10b981' },
  error:   { bg: '#fef2f2', border: '#fca5a5', text: '#7f1d1d', icon: '#ef4444' },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e3a5f', icon: '#3b82f6' },
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        zIndex: 9999, pointerEvents: 'none'
      }}>
        {toasts.map(toast => {
          const c = colors[toast.type];
          return (
            <div key={toast.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: '10px', padding: '14px 18px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              pointerEvents: 'all', minWidth: '280px', maxWidth: '380px',
              animation: 'slideIn 0.25s ease-out'
            }}>
              <span style={{ color: c.icon, flexShrink: 0 }}>{icons[toast.type]}</span>
              <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: c.text }}>{toast.message}</span>
              <button
                onClick={() => remove(toast.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.icon, opacity: 0.6, padding: 0, lineHeight: 1 }}
              >✕</button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
