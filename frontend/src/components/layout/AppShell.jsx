import { useState } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Navbar } from './Navbar.jsx';

export const AppShell = ({ activeTab, onSelectTab, onOpenNewTransaction, children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'transactions':
        return 'Ledger Transactions';
      case 'accounts':
        return 'Accounts & Balances';
      case 'credit-cards':
        return 'Credit Cards & Statements';
      case 'categories':
        return 'Categories & Hierarchy';
      case 'budgets':
        return 'Monthly Budgets';
      case 'recurring':
        return 'Recurring Schedules';
      case 'reports':
        return 'Financial Reports & Analytics';
      default:
        return activeTab;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="main-content">
        <Navbar
          title={getPageTitle()}
          onOpenNewTransaction={onOpenNewTransaction}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />
        <main className="page-wrapper">{children}</main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            position: fixed !important;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            z-index: 100 !important;
          }
          .sidebar.open {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </div>
  );
};
