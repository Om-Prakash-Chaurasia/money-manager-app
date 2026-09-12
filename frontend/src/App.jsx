import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { AuthView } from './views/auth/AuthView.jsx';
import { DashboardView } from './views/dashboard/DashboardView.jsx';
import { TransactionsView } from './views/transactions/TransactionsView.jsx';
import { AccountsView } from './views/accounts/AccountsView.jsx';
import { CreditCardsView } from './views/creditCards/CreditCardsView.jsx';
import { CategoriesView } from './views/categories/CategoriesView.jsx';
import { BudgetsView } from './views/budgets/BudgetsView.jsx';
import { RecurringView } from './views/recurring/RecurringView.jsx';
import { ReportsView } from './views/reports/ReportsView.jsx';
import { NewTransactionModal } from './components/transactions/NewTransactionModal.jsx';
import { LoadingSpinner, ErrorBoundary } from './components/ui/index.js';

const MainApp = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-body)'
        }}
      >
        <LoadingSpinner text="Restoring Money Manager session & double-entry ledger..." size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  const handleTransactionSuccess = () => {
    // Triggers re-fetch across child views
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
      >
        {activeTab === 'dashboard' && (
          <DashboardView
            key={`dash-${refreshTrigger}`}
            onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            key={`tx-${refreshTrigger}`}
            onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView key={`acc-${refreshTrigger}`} />
        )}

        {activeTab === 'credit-cards' && (
          <CreditCardsView key={`cc-${refreshTrigger}`} />
        )}

        {activeTab === 'categories' && (
          <CategoriesView key={`cat-${refreshTrigger}`} />
        )}

        {activeTab === 'budgets' && (
          <BudgetsView key={`bud-${refreshTrigger}`} />
        )}

        {activeTab === 'recurring' && (
          <RecurringView key={`rec-${refreshTrigger}`} />
        )}

        {activeTab === 'reports' && (
          <ReportsView key={`rep-${refreshTrigger}`} />
        )}
      </AppShell>

      {/* Global New Transaction Modal */}
      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
        onSuccess={handleTransactionSuccess}
      />
    </>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
