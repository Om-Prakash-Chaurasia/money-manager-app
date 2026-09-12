import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading data...', size = 36 }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        gap: '1rem',
        color: 'var(--text-secondary)'
      }}
    >
      <Loader2
        size={size}
        style={{
          color: 'var(--color-primary)',
          animation: 'spin 1s linear infinite'
        }}
      />
      {text && <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{text}</span>}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
