import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Paperclip,
  Edit2,
  Trash2,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { transactionsApi, accountsApi, categoriesApi, exportApi, attachmentsApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, Button, Input, Select, Badge, LoadingSpinner, EmptyState, Modal } from '../../components/ui/index.js';
import { EditTransactionModal } from './EditTransactionModal.jsx';
import { ReceiptPreviewModal } from './ReceiptPreviewModal.jsx';

export const TransactionsView = ({ onOpenNewTransaction }) => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Reference data for filters
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Filter state
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [editingTx, setEditingTx] = useState(null);
  const [deletingTx, setDeletingTx] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [previewAttachments, setPreviewAttachments] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [type, accountId, categoryId, startDate, endDate]);

  const loadReferenceData = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        accountsApi.getAll({ limit: 100 }),
        categoriesApi.getAll({ limit: 100 })
      ]);
      const accList = Array.isArray(accRes?.data) ? accRes.data : (accRes?.data?.accounts || []);
      const catList = Array.isArray(catRes?.data) ? catRes.data : (catRes?.data?.categories || []);
      setAccounts(accList);
      setCategories(catList);
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  };

  const fetchTransactions = async (targetPage = 1) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: pagination.limit,
        sortBy: 'date',
        sortOrder: 'desc'
      };

      if (type !== 'ALL') params.type = type;
      if (accountId) params.accountId = accountId;
      if (categoryId) params.categoryId = categoryId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search.trim()) params.search = search.trim();

      const res = await transactionsApi.getAll(params);
      if (res?.data) {
        const txList = Array.isArray(res.data) ? res.data : (res.data.transactions || []);
        setTransactions(txList);
        setPagination(res.pagination || res.data?.pagination || { page: 1, limit: 15, total: txList.length, totalPages: 1 });
        setSummary(res.meta?.summary || res.data?.summary || res.summary || null);
      }
    } catch (err) {
      showToast('Failed to retrieve transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setType('ALL');
    setAccountId('');
    setCategoryId('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => fetchTransactions(1), 0);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTx) return;
    setDeletingLoading(true);
    try {
      await transactionsApi.delete(deletingTx._id || deletingTx.id);
      showToast('Transaction deleted & balance restored atomically', 'success');
      setDeletingTx(null);
      fetchTransactions(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete transaction', 'error');
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleOpenReceipt = async (tx) => {
    try {
      const res = await attachmentsApi.getByTransaction(tx._id || tx.id);
      if (res?.data && res.data.length > 0) {
        setPreviewAttachments(res.data);
      } else {
        showToast('No receipt attachments found for this transaction', 'info');
      }
    } catch (err) {
      showToast('Failed to load receipts', 'error');
    }
  };

  const handleExportCSV = () => {
    const params = {};
    if (type !== 'ALL') params.type = type;
    if (accountId) params.accountId = accountId;
    if (categoryId) params.categoryId = categoryId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    params.format = 'csv';

    const url = exportApi.transactionsUrl(params);
    window.open(url, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Ledger Transactions</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Search, filter, edit, and audit all atomic transactions and receipts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={Download} onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Button variant="primary" icon={Plus} onClick={onOpenNewTransaction}>
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Financial Summary Strip */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Filtered Income
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-income)' }}>
              {summary.formattedIncome || '₹0.00'}
            </span>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Filtered Expenses
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-expense)' }}>
              {summary.formattedExpense || '₹0.00'}
            </span>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {summary.netSavings >= 0 ? 'Net Savings' : 'Net Deficit'}
            </span>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: summary.netSavings >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
              }}
            >
              {summary.formattedNetSavings || '₹0.00'}
            </span>
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Transfers Total
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-transfer)' }}>
              {summary.formattedTransfer || '₹0.00'}
            </span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <Card>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem'
            }}
          >
            {/* Search Input */}
            <Input
              placeholder="Search description or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />

            {/* Type Select */}
            <Select
              value={type}
              placeholder=""
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Types' },
                { value: 'INCOME', label: 'Income Only' },
                { value: 'EXPENSE', label: 'Expense Only' },
                { value: 'TRANSFER', label: 'Transfers Only' }
              ]}
            />

            {/* Account Select */}
            <Select
              value={accountId}
              placeholder=""
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: '', label: 'All Accounts' },
                ...accounts.map((acc) => ({ value: acc._id || acc.id, label: acc.name }))
              ]}
            />

            {/* Category Select */}
            <Select
              value={categoryId}
              placeholder=""
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map((cat) => ({ value: cat._id || cat.id, label: `${cat.name} (${cat.type})` }))
              ]}
            />

            {/* Date Filters */}
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="From Date"
              aria-label="From Date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="To Date"
              aria-label="To Date"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" size="sm" icon={RotateCcw} onClick={handleResetFilters} type="button">
              Reset
            </Button>
            <Button variant="primary" size="sm" icon={Search} type="submit">
              Apply Filters
            </Button>
          </div>
        </form>
      </Card>

      {/* Transactions Ledger Table */}
      <Card noPadding>
        {loading ? (
          <div style={{ padding: '3rem' }}>
            <LoadingSpinner text="Retrieving double-entry ledger transactions..." />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="No ledger transactions match your selected search criteria and filters."
            actionLabel="Add Transaction"
            onAction={onOpenNewTransaction}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-card)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  <th style={{ padding: '0.875rem 1.25rem' }}>Date</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Type</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Description</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Account / Route</th>
                  <th style={{ padding: '0.875rem 1.25rem' }}>Category</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'center' }}>Receipt</th>
                  <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isIncome = tx.type === 'INCOME';
                  const isExpense = tx.type === 'EXPENSE';
                  const isTransfer = tx.type === 'TRANSFER';

                  return (
                    <tr
                      key={tx._id || tx.id}
                      style={{
                        borderBottom: '1px solid var(--border-card)',
                        transition: 'background var(--transition-fast)'
                      }}
                      className="table-row-hover"
                    >
                      {/* Date */}
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                        {new Date(tx.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          {isIncome && <ArrowDownRight size={14} style={{ color: 'var(--color-income)' }} />}
                          {isExpense && <ArrowUpRight size={14} style={{ color: 'var(--color-expense)' }} />}
                          {isTransfer && <ArrowLeftRight size={14} style={{ color: 'var(--color-transfer)' }} />}
                          <Badge variant={isIncome ? 'income' : isExpense ? 'expense' : 'transfer'} size="sm">
                            {tx.type}
                          </Badge>
                        </div>
                      </td>

                      {/* Description & Note */}
                      <td style={{ padding: '0.875rem 1.25rem', maxWidth: '240px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {tx.description}
                        </div>
                        {tx.note && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {tx.note}
                          </div>
                        )}
                      </td>

                      {/* Account / Route */}
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8125rem' }}>
                        {isTransfer ? (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            <strong>{tx.fromAccountId?.name || 'Account'}</strong> →{' '}
                            <strong>{tx.toAccountId?.name || 'Account'}</strong>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {tx.accountId?.name || 'Account'}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        {tx.categoryId ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              fontSize: '0.8125rem',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: tx.categoryId.color || 'var(--color-primary)'
                              }}
                            />
                            {tx.categoryId.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        style={{
                          padding: '0.875rem 1.25rem',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          color: isIncome
                            ? 'var(--color-income)'
                            : isExpense
                            ? 'var(--color-expense)'
                            : 'var(--text-primary)'
                        }}
                      >
                        {isIncome ? `+${tx.formattedAmount}` : isExpense ? `-${tx.formattedAmount}` : tx.formattedAmount}
                      </td>

                      {/* Receipt Indicator */}
                      <td style={{ padding: '0.875rem 1.25rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(tx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                          title="View attached receipts"
                        >
                          <Paperclip size={16} />
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => setEditingTx(tx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                            title="Edit transaction"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTx(tx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-expense)',
                              cursor: 'pointer',
                              padding: '0.25rem'
                            }}
                            title="Delete transaction (reverses balance)"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--border-card)',
              background: 'var(--bg-surface)',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Showing {transactions.length} of {pagination.total} transactions (Page {pagination.page} of{' '}
              {pagination.totalPages})
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                variant="secondary"
                size="sm"
                icon={ChevronLeft}
                disabled={pagination.page <= 1}
                onClick={() => fetchTransactions(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={ChevronRight}
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchTransactions(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Transaction Modal */}
      {editingTx && (
        <EditTransactionModal
          isOpen={Boolean(editingTx)}
          onClose={() => setEditingTx(null)}
          transaction={editingTx}
          accounts={accounts}
          categories={categories}
          onSuccess={() => fetchTransactions(pagination.page)}
        />
      )}

      {/* Receipt Preview Modal */}
      {previewAttachments && (
        <ReceiptPreviewModal
          isOpen={Boolean(previewAttachments)}
          onClose={() => setPreviewAttachments(null)}
          attachments={previewAttachments}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingTx)}
        onClose={() => setDeletingTx(null)}
        title="Confirm Transaction Deletion"
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
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem' }}>
              Are you sure you want to delete <strong>{deletingTx?.description}</strong> ({deletingTx?.formattedAmount})?
            </div>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Deleting this transaction will <strong>atomically reverse</strong> the balance adjustment on your account,
            restoring the funds to preserve double-entry ledger accuracy.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setDeletingTx(null)} disabled={deletingLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={deletingLoading}
              icon={Trash2}
            >
              Delete & Reverse
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
