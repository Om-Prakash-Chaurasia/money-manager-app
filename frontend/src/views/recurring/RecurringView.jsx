import { useState, useEffect } from 'react';
import {
  Repeat,
  Plus,
  Calendar,
  Play,
  Pause,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { recurringApi, accountsApi, categoriesApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, Badge, Button, LoadingSpinner, EmptyState, Modal } from '../../components/ui/index.js';
import { NewRecurringModal } from './NewRecurringModal.jsx';

export const RecurringView = () => {
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFreq, setSelectedFreq] = useState('ALL');

  // Modals & Action States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recRes, accRes, catRes] = await Promise.all([
        recurringApi.getAll(),
        accountsApi.getAll({ limit: 100 }),
        categoriesApi.getAll({ limit: 100 })
      ]);

      if (recRes?.data) {
        const recList = Array.isArray(recRes.data) ? recRes.data : (recRes.data.templates || []);
        setTemplates(recList);
      }
      if (accRes?.data) {
        const accList = Array.isArray(accRes.data) ? accRes.data : (accRes.data.accounts || []);
        setAccounts(accList);
      }
      if (catRes?.data) {
        const catList = Array.isArray(catRes.data) ? catRes.data : (catRes.data.categories || []);
        setCategories(catList);
      }
    } catch (err) {
      showToast('Failed to load recurring transaction templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (template) => {
    const id = template._id || template.id;
    const newStatus = !template.isActive;
    setToggleLoadingId(id);
    try {
      await recurringApi.update(id, { isActive: newStatus });
      showToast(
        newStatus ? 'Recurring schedule activated' : 'Recurring schedule paused',
        'success'
      );
      setTemplates((prev) =>
        prev.map((t) => ((t._id || t.id) === id ? { ...t, isActive: newStatus } : t))
      );
    } catch (err) {
      showToast('Failed to update schedule status', 'error');
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTemplate) return;
    setDeleteLoading(true);
    const id = deletingTemplate._id || deletingTemplate.id;
    try {
      await recurringApi.delete(id);
      showToast('Recurring template deleted', 'success');
      setDeletingTemplate(null);
      setTemplates((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete template', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredTemplates =
    selectedFreq === 'ALL'
      ? templates
      : templates.filter((t) => t.frequency === selectedFreq);

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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Recurring Transaction Schedules</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Automate scheduled income, bills, subscriptions, and investments.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setIsAddOpen(true)}>
          Add Schedule
        </Button>
      </div>

      {/* Frequency Filter Tabs */}
      <div className="filter-tabs-container">
        {[
          { id: 'ALL', label: 'All Schedules' },
          { id: 'DAILY', label: 'Daily' },
          { id: 'WEEKLY', label: 'Weekly' },
          { id: 'MONTHLY', label: 'Monthly' },
          { id: 'YEARLY', label: 'Yearly' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedFreq(tab.id)}
            className={`filter-tab ${selectedFreq === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Schedules List */}
      {loading ? (
        <LoadingSpinner text="Loading recurring schedules & next execution dates..." />
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          title="No recurring templates found"
          description="Create recurring templates for automated subscriptions, salary credits, or regular transfers."
          actionLabel="Create Schedule"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '1.25rem'
          }}
        >
          {filteredTemplates.map((t) => {
            const isIncome = t.type === 'INCOME';
            const isExpense = t.type === 'EXPENSE';
            const isTransfer = t.type === 'TRANSFER';
            const id = t._id || t.id;
            const amountColor = isIncome
              ? 'var(--color-income)'
              : isExpense
              ? 'var(--color-expense)'
              : 'var(--color-transfer)';

            return (
              <Card key={id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Top Row: Description & Status Pill */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {t.description}
                      </h4>
                      {t.note && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                          {t.note}
                        </p>
                      )}
                    </div>

                    <Badge variant={t.isActive ? 'income' : 'neutral'} size="sm">
                      {t.isActive ? 'ACTIVE' : 'PAUSED'}
                    </Badge>
                  </div>

                  {/* Flow Type & Frequency Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge variant={isIncome ? 'income' : isExpense ? 'expense' : 'transfer'} size="sm">
                      {t.type}
                    </Badge>
                    <Badge variant="primary" size="sm">
                      <Repeat size={11} style={{ marginRight: '4px' }} />
                      {t.frequency}
                    </Badge>
                  </div>

                  {/* Amount & Account / Route */}
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.875rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recurring Amount</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: amountColor }}>
                        {isIncome ? '+' : isExpense ? '-' : ''}₹{((t.amount || 0) / 100).toFixed(2)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {isTransfer ? (
                        <span>
                          <strong>{t.fromAccountId?.name || 'Account'}</strong> →{' '}
                          <strong>{t.toAccountId?.name || 'Account'}</strong>
                        </span>
                      ) : (
                        <span>
                          Account: <strong>{t.accountId?.name || 'Account'}</strong>
                          {t.categoryId && <span> • Category: <strong>{t.categoryId.name}</strong></span>}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Schedule Next Run Info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-card)',
                      paddingTop: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Clock size={14} style={{ color: 'var(--color-primary)' }} />
                      <span>
                        Next run:{' '}
                        <strong>
                          {t.nextRunDate
                            ? new Date(t.nextRunDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : 'Pending'}
                        </strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(t)}
                        disabled={toggleLoadingId === id}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: t.isActive ? 'var(--color-warning)' : 'var(--color-income)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        title={t.isActive ? 'Pause Schedule' : 'Activate Schedule'}
                      >
                        {t.isActive ? <Pause size={16} /> : <Play size={16} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingTemplate(t)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-expense)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        title="Delete Schedule"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Recurring Modal */}
      <NewRecurringModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        accounts={accounts}
        categories={categories}
        onSuccess={loadData}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingTemplate)}
        onClose={() => setDeletingTemplate(null)}
        title="Delete Recurring Schedule"
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
              Delete recurring template <strong>{deletingTemplate?.description}</strong>?
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            This will permanently halt future scheduled executions. Any transactions already posted to your ledger remain safe and intact.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setDeletingTemplate(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={deleteLoading}>
              Delete Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
