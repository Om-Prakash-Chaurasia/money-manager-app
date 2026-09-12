import { useState, useEffect } from 'react';
import {
  Landmark,
  Wallet,
  CreditCard,
  PiggyBank,
  Plus,
  ArrowLeftRight,
  Edit2,
  Trash2,
  TrendingUp,
  Coins,
  ShieldCheck,
  AlertCircle,
  Archive,
  ArchiveRestore
} from 'lucide-react';
import { accountsApi, exportApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, StatCard, Badge, Button, LoadingSpinner, EmptyState, Modal, Input } from '../../components/ui/index.js';
import { NewAccountModal } from './NewAccountModal.jsx';
import { TransferModal } from './TransferModal.jsx';

const getAccountIcon = (iconName, type) => {
  switch (iconName || type) {
    case 'wallet':
    case 'CASH':
      return <Wallet size={20} />;
    case 'credit-card':
    case 'CREDIT_CARD':
      return <CreditCard size={20} />;
    case 'piggy-bank':
      return <PiggyBank size={20} />;
    case 'coins':
      return <Coins size={20} />;
    case 'trending-up':
      return <TrendingUp size={20} />;
    case 'landmark':
    case 'BANK':
    default:
      return <Landmark size={20} />;
  }
};

export const AccountsView = () => {
  const [accounts, setAccounts] = useState([]);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  // Modals
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [restoreLoadingId, setRestoreLoadingId] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const [activeRes, archivedRes] = await Promise.all([
        accountsApi.getAll({ limit: 100, isActive: true }),
        accountsApi.getAll({ limit: 100, isActive: false })
      ]);

      if (activeRes?.data) {
        const accList = Array.isArray(activeRes.data) ? activeRes.data : (activeRes.data.accounts || []);
        setAccounts(accList);
        const summaryData = activeRes.meta?.summary || activeRes.data?.summary || activeRes.summary || null;
        setSummary(summaryData);
      }

      if (archivedRes?.data) {
        const archList = Array.isArray(archivedRes.data) ? archivedRes.data : (archivedRes.data.accounts || []);
        setArchivedAccounts(archList);
      }
    } catch (err) {
      showToast('Failed to load accounts portfolio', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (acc) => {
    setEditingAccount(acc);
    setEditName(acc.name);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Account name cannot be empty', 'warning');
      return;
    }
    setEditLoading(true);
    try {
      await accountsApi.update(editingAccount._id || editingAccount.id, {
        name: editName.trim()
      });
      showToast('Account name updated successfully', 'success');
      setEditingAccount(null);
      fetchAccounts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update account', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAccount) return;
    setDeleteLoading(true);
    try {
      await accountsApi.delete(deletingAccount._id || deletingAccount.id);
      showToast(`Account "${deletingAccount.name}" archived. You can view or restore it in the "Archived" tab.`, 'success');
      setDeletingAccount(null);
      fetchAccounts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete account', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestoreAccount = async (acc) => {
    const id = acc._id || acc.id;
    setRestoreLoadingId(id);
    try {
      await accountsApi.update(id, { isActive: true });
      showToast(`Account "${acc.name}" restored successfully`, 'success');
      fetchAccounts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to restore account', 'error');
    } finally {
      setRestoreLoadingId(null);
    }
  };

  const isArchivedTab = selectedFilter === 'ARCHIVED';

  const displayedAccounts = isArchivedTab
    ? archivedAccounts
    : selectedFilter === 'ALL'
    ? accounts
    : accounts.filter((a) => a.type === selectedFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Accounts & Balances</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Manage Bank, Cash, and Asset accounts with double-entry balance tracking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={ArrowLeftRight} onClick={() => setIsTransferOpen(true)}>
            Transfer Funds
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => setIsNewAccountOpen(true)}>
            Add Account
          </Button>
        </div>
      </div>

      {/* Net Portfolio Summary */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem'
          }}
        >
          <StatCard
            title="Total Liquid Assets"
            value={summary.formattedTotalAssets || summary.formattedAssets || '₹0.00'}
            subtitle="Cash & Bank account holdings"
            icon={Landmark}
            trendType="neutral"
          />
          <StatCard
            title="Total Liabilities"
            value={summary.formattedTotalLiabilities || summary.formattedLiabilities || '₹0.00'}
            subtitle="Credit card debt & loan balances"
            icon={CreditCard}
            trendType="negative"
          />
          <StatCard
            title="Net Worth"
            value={summary.formattedNetWorth || '₹0.00'}
            subtitle="Assets minus liabilities"
            icon={PiggyBank}
            trendType={summary.netWorth >= 0 ? 'positive' : 'negative'}
            valueColor={summary.netWorth < 0 ? 'var(--color-expense)' : undefined}
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs-container">
        {[
          { id: 'ALL', label: 'All Accounts' },
          { id: 'BANK', label: 'Bank Accounts' },
          { id: 'CASH', label: 'Cash Wallets' },
          { id: 'CREDIT_CARD', label: 'Credit Cards' },
          { id: 'OTHER', label: 'Assets & Other' },
          {
            id: 'ARCHIVED',
            label: archivedAccounts.length > 0 ? `Archived (${archivedAccounts.length})` : 'Archived',
            icon: Archive
          }
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`filter-tab ${selectedFilter === tab.id ? 'active' : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {TabIcon && <TabIcon size={14} />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Accounts Cards Grid */}
      {loading ? (
        <LoadingSpinner text="Loading accounts portfolio..." />
      ) : displayedAccounts.length === 0 ? (
        isArchivedTab ? (
          <EmptyState
            title="No archived accounts"
            description="You don't have any archived or deactivated accounts. Accounts you delete are safely archived here and can be restored anytime."
          />
        ) : (
          <EmptyState
            title="No accounts found"
            description="Create your first bank, cash, or credit account to begin tracking balances."
            actionLabel="Add Account"
            onAction={() => setIsNewAccountOpen(true)}
          />
        )
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '1.25rem'
          }}
        >
          {displayedAccounts.map((acc) => {
            const isCreditCard = acc.type === 'CREDIT_CARD';
            const balanceColor =
              acc.balance > 0
                ? 'var(--color-income)'
                : acc.balance < 0
                ? 'var(--color-expense)'
                : 'var(--text-primary)';

            return (
              <div
                key={acc._id || acc.id}
                style={{
                  background: 'var(--bg-card)',
                  border: isArchivedTab ? '1px dashed var(--border-card)' : '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isArchivedTab ? 0.9 : 1,
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
                }}
                className="hover-card"
              >
                {/* Top Accent Strip */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: isArchivedTab ? 'var(--text-muted)' : (acc.color || 'var(--color-primary)')
                  }}
                />

                {/* Card Top: Icon, Name & Type */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          background: `${acc.color || 'var(--color-primary)'}22`,
                          color: acc.color || 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {getAccountIcon(acc.icon, acc.type)}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {acc.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {acc.subType || acc.type}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {isArchivedTab && (
                        <Badge variant="secondary" size="sm">
                          ARCHIVED
                        </Badge>
                      )}
                      <Badge variant={isCreditCard ? 'warning' : 'primary'} size="sm">
                        {acc.type}
                      </Badge>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div style={{ margin: '1rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {isArchivedTab
                          ? 'Final Ledger Balance'
                          : isCreditCard
                          ? (acc.balance < 0 ? 'Current Outstanding (Due)' : 'Current Balance')
                          : 'Current Net Balance'}
                      </span>
                      {isCreditCard && acc.balance < 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-expense)', fontWeight: 600 }}>
                          Debt Owed
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: balanceColor, whiteSpace: 'nowrap' }}>
                      {acc.formattedBalance || '₹0.00'}
                    </div>
                  </div>

                  {/* Opening Balance Metadata */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      padding: '0.5rem 0',
                      borderTop: '1px solid var(--border-card)'
                    }}
                  >
                    <span>Opening Balance:</span>
                    <span style={{ fontWeight: 600 }}>₹{(acc.openingBalance / 100).toFixed(2)}</span>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isArchivedTab ? 'flex-end' : 'space-between',
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-card)'
                  }}
                >
                  {isArchivedTab ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ArchiveRestore}
                      loading={restoreLoadingId === (acc._id || acc.id)}
                      onClick={() => handleRestoreAccount(acc)}
                    >
                      Restore Account
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={ArrowLeftRight}
                        onClick={() => setIsTransferOpen(true)}
                      >
                        Transfer
                      </Button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(acc)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '0.375rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                          title="Edit Account"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAccount(acc)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-expense)',
                            cursor: 'pointer',
                            padding: '0.375rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                          title="Archive Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Account Modal */}
      <NewAccountModal
        isOpen={isNewAccountOpen}
        onClose={() => setIsNewAccountOpen(false)}
        onSuccess={fetchAccounts}
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={accounts}
        onSuccess={fetchAccounts}
      />

      {/* Edit Account Modal */}
      {editingAccount && (
        <Modal
          isOpen={Boolean(editingAccount)}
          onClose={() => setEditingAccount(null)}
          title="Edit Account Name"
          size="sm"
        >
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Account Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setEditingAccount(null)} disabled={editLoading}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={editLoading}>
                Save
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete / Archive Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingAccount)}
        onClose={() => setDeletingAccount(null)}
        title="Archive Account"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--color-expense)',
              padding: '0.75rem',
              background: 'rgba(244, 63, 94, 0.1)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <AlertCircle size={24} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem' }}>
              Archive <strong>{deletingAccount?.name}</strong>?
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            This account will be deactivated from active selection. Existing transaction history remains safe and intact for reporting and audits. You can view or restore it at any time from the <strong>Archived</strong> tab.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setDeletingAccount(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={deleteLoading}>
              Archive Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
