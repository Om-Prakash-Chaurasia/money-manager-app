import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  PieChart,
  Repeat,
  BarChart3,
  FolderTree,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Sidebar = ({ activeTab, onSelectTab, isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'credit-cards', label: 'Credit Cards', icon: CreditCard },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'recurring', label: 'Recurring', icon: Repeat },
    { id: 'reports', label: 'Reports', icon: BarChart3 }
  ];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
            display: 'block'
          }}
          className="md:hidden"
        />
      )}

      <aside
        style={{
          width: '260px',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-card)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          transition: 'transform var(--transition-normal)'
        }}
        className={`sidebar ${isOpen ? 'open' : ''}`}
      >
        {/* Brand Logo Header */}
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Money Manager
            </h2>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Double-Entry Ledger
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '1.25rem 0.875rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} className="nav-icon" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Account Profile Footer */}
        {user && (
          <div className="sidebar-user">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  flexShrink: 0
                }}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {user.email}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Logout"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-expense)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
