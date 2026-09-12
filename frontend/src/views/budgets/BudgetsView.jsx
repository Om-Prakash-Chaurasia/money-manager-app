import { useState, useEffect } from 'react';
import {
  PiggyBank,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Edit2,
  Trash2
} from 'lucide-react';
import { budgetsApi, categoriesApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, StatCard, Badge, Button, LoadingSpinner, EmptyState, Modal } from '../../components/ui/index.js';
import { SetBudgetModal } from './SetBudgetModal.jsx';

export const BudgetsView = () => {
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  });

  // Modals
  const [isSetBudgetOpen, setIsSetBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [deletingBudget, setDeletingBudget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    fetchBudgetsData(selectedMonth);
  }, [selectedMonth]);

  const loadCategories = async () => {
    try {
      const res = await categoriesApi.getAll({ type: 'EXPENSE', limit: 100 });
      if (res?.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchBudgetsData = async (month) => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        budgetsApi.getAll({ month }),
        budgetsApi.getSummary({ month })
      ]);

      if (listRes?.data) {
        setBudgets(listRes.data || []);
      }
      if (sumRes?.data) {
        setSummary(sumRes.data || null);
      }
    } catch (err) {
      showToast('Failed to retrieve budget allocations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBudget) return;
    setDeleteLoading(true);
    try {
      await budgetsApi.delete(deletingBudget._id || deletingBudget.id);
      showToast('Budget allocation removed', 'success');
      setDeletingBudget(null);
      fetchBudgetsData(selectedMonth);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete budget', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Monthly Category Budgets</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Establish spending guardrails with parent and subcategory expense rollups.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Month Selector */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '0.45rem 0.75rem',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={(e) => {
              const input = e.currentTarget.querySelector('input');
              try { input?.showPicker?.(); } catch (_) {}
            }}
          >
            <Calendar size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, pointerEvents: 'none' }} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              onClick={(e) => { try { e.target.showPicker?.(); } catch (_) {} }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
                padding: 0
              }}
            />
          </div>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setEditingBudget(null);
              setIsSetBudgetOpen(true);
            }}
          >
            Set Budget
          </Button>
        </div>
      </div>

      {/* Top Overview Strip */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem'
          }}
        >
          <StatCard
            title="Total Budget Limit"
            value={summary.formattedTotalBudget || '₹0.00'}
            subtitle={`Allocated across ${summary.budgetCount || 0} categories`}
            icon={PiggyBank}
            trend="neutral"
          />
          <StatCard
            title="Total Actual Spent"
            value={summary.formattedTotalSpent || '₹0.00'}
            subtitle={`${summary.overallPercentageUsed || 0}% of budget spent`}
            icon={TrendingDown}
            trend={summary.overallPercentageUsed > 100 ? 'negative' : 'neutral'}
          />
          <StatCard
            title="Remaining Budget"
            value={summary.formattedTotalRemaining || '₹0.00'}
            subtitle={
              summary.overallStatus === 'EXCEEDED'
                ? 'Budget exceeded!'
                : summary.overallStatus === 'WARNING'
                ? 'Approaching threshold'
                : 'Within safe limits'
            }
            icon={
              summary.overallStatus === 'EXCEEDED'
                ? AlertTriangle
                : summary.overallStatus === 'WARNING'
                ? AlertCircle
                : CheckCircle2
            }
            trend={summary.overallStatus === 'EXCEEDED' ? 'negative' : 'positive'}
          />
        </div>
      )}

      {/* Budget Cards List */}
      {loading ? (
        <LoadingSpinner text="Calculating category spending rollups & budget limits..." />
      ) : budgets.length === 0 ? (
        <EmptyState
          title={`No budgets set for ${selectedMonth}`}
          description="Allocate a monthly spending limit to your expense categories to keep your personal finances disciplined."
          actionLabel="Set Category Budget"
          onAction={() => {
            setEditingBudget(null);
            setIsSetBudgetOpen(true);
          }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {budgets.map((b) => {
            const catName = b.categoryId?.name || 'Category';
            const catColor = b.categoryId?.color || 'var(--color-primary)';
            const pct = Math.min(100, b.percentageUsed || 0);
            const isExceeded = b.status === 'EXCEEDED';
            const isWarning = b.status === 'WARNING';

            const barColor = isExceeded
              ? 'var(--color-expense)'
              : isWarning
              ? 'var(--color-warning)'
              : 'var(--color-income)';

            return (
              <Card key={b._id || b.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Category Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: catColor
                        }}
                      />
                      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{catName}</h4>
                    </div>

                    <Badge
                      variant={isExceeded ? 'expense' : isWarning ? 'warning' : 'income'}
                      size="sm"
                    >
                      {b.status}
                    </Badge>
                  </div>

                  {/* Spending progress bar */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8125rem',
                        marginBottom: '0.375rem'
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Spent: <strong>{b.formattedSpent || `₹${((b.spent || 0) / 100).toFixed(2)}`}</strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Limit: <strong>{b.formattedAmount || `₹${((b.amount || 0) / 100).toFixed(2)}`}</strong>
                      </span>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: barColor,
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Bottom remaining amount & actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.8125rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-card)'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {isExceeded ? 'Overspent:' : 'Remaining:'}
                      </span>
                      <div
                        style={{
                          fontWeight: 700,
                          color: isExceeded ? 'var(--color-expense)' : 'var(--color-income)'
                        }}
                      >
                        {b.formattedRemaining || `₹${(Math.abs(b.remaining || 0) / 100).toFixed(2)}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBudget(b);
                          setIsSetBudgetOpen(true);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '0.375rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        title="Edit Budget"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingBudget(b)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-expense)',
                          cursor: 'pointer',
                          padding: '0.375rem',
                          borderRadius: 'var(--radius-sm)'
                        }}
                        title="Delete Budget"
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

      {/* Set/Edit Budget Modal */}
      <SetBudgetModal
        isOpen={isSetBudgetOpen}
        onClose={() => {
          setIsSetBudgetOpen(false);
          setEditingBudget(null);
        }}
        categories={categories}
        selectedMonth={selectedMonth}
        existingBudget={editingBudget}
        onSuccess={() => fetchBudgetsData(selectedMonth)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingBudget)}
        onClose={() => setDeletingBudget(null)}
        title="Remove Budget Allocation"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Are you sure you want to remove the budget for{' '}
            <strong>{deletingBudget?.categoryId?.name || 'this category'}</strong> for {selectedMonth}?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setDeletingBudget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={deleteLoading}>
              Remove Budget
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
