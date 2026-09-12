import { Sun, Moon, Plus, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Button } from '../ui/Button.jsx';

export const Navbar = ({ title, onOpenNewTransaction, onToggleMobileSidebar }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="app-navbar"
      style={{
        height: '70px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.75rem',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="btn-ghost"
          style={{
            border: 'none',
            background: 'transparent',
            padding: '8px',
            color: 'var(--text-primary)',
            display: 'none',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)'
          }}
          id="mobile-menu-btn"
          aria-label="Toggle navigation menu"
        >
          <Menu size={24} />
        </button>

        <div className="navbar-title-wrapper" style={{ minWidth: 0 }}>
          <h1
            className="navbar-title"
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              textTransform: 'capitalize',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {title}
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="btn-secondary btn-icon"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          style={{
            width: '38px',
            height: '38px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            background: 'var(--bg-surface)'
          }}
        >
          {theme === 'dark' ? (
            <Sun size={18} style={{ color: '#f59e0b' }} />
          ) : (
            <Moon size={18} style={{ color: '#6366f1' }} />
          )}
        </button>

        {/* Quick Action Button */}
        {onOpenNewTransaction && (
          <Button variant="primary" size="md" icon={Plus} onClick={onOpenNewTransaction} className="navbar-add-btn">
            <span className="navbar-btn-text">Add Transaction</span>
          </Button>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn {
            display: inline-flex !important;
          }
          .app-navbar {
            padding: 0 0.875rem !important;
            height: 60px !important;
          }
          .navbar-title-wrapper {
            display: none !important;
          }
          .navbar-btn-text {
            display: none !important;
          }
          .navbar-add-btn {
            padding: 0.5rem 0.75rem !important;
          }
        }
      `}</style>
    </header>
  );
};
