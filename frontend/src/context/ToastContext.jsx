import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {toasts.map((toast) => {
          let Icon = Info;
          if (toast.type === 'success') Icon = CheckCircle2;
          if (toast.type === 'error') Icon = AlertCircle;
          if (toast.type === 'warning') Icon = AlertTriangle;

          return (
            <div key={toast.id} className={`toast toast-${toast.type}`} role="alert">
              <Icon size={20} className={`text-${toast.type}`} />
              <div style={{ flex: 1, fontSize: '0.875rem' }}>{toast.message}</div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="btn-ghost"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: 'inherit',
                  opacity: 0.7
                }}
                aria-label="Close notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
