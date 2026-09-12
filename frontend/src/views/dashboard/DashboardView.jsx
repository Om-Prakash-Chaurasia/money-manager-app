import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  PieChart,
  Calendar,
  CreditCard,
  Plus
} from 'lucide-react';
import { dashboardApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, StatCard, Badge, Button, LoadingSpinner, EmptyState } from '../../components/ui/index.js';

export const DashboardView = ({ onOpenNewTransaction }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  });

  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchDashboardData(selectedMonth);
  }, [selectedMonth]);

  const fetchDashboardData = async (month) => {
    setLoading(true);
    try {
      const res = await dashboardApi.getSummary({ month });
      if (res?.data) {
        setSummary(res.data);
      }
    } catch (err) {
      showToast('Failed to load dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !summary) {
    return <LoadingSpinner text="Computing real-time ledger metrics & net worth..." />;
  }

  const kpis = summary?.kpis || {};
  const categoryBreakdown = summary?.categorySpending || [];
  const budgets = summary?.budgets || [];
  const recentTransactions = summary?.recentTransactions || [];
  // Sort descending: current month on top, previous months below
  const cashFlowTrend = [...(summary?.cashFlowTrend || [])].sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div>
      {/* Top Banner: Welcome & Month Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            Welcome back, {user?.name || 'Investor'}! 👋
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Here is your financial overview and double-entry portfolio summary for {selectedMonth}.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

          <Button variant="primary" icon={Plus} size="sm" onClick={onOpenNewTransaction}>
            Add Entry
          </Button>
        </div>
      </div>

      {/* 4 Key Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Total Net Worth"
          value={kpis.netWorthFormatted || '₹0.00'}
          valueColor={(kpis.netWorth || 0) < 0 ? 'var(--color-expense)' : undefined}
          subtext={`Assets: ${kpis.totalAssetsFormatted || '0'} | Debts: ${kpis.totalLiabilitiesFormatted || '0'}`}
          icon={Wallet}
          iconBg={(kpis.netWorth || 0) < 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)'}
          iconColor={(kpis.netWorth || 0) < 0 ? 'var(--color-expense)' : 'var(--color-income)'}
          trend={(kpis.netWorth || 0) < 0 ? 'Net Debt' : null}
          trendType={(kpis.netWorth || 0) < 0 ? 'negative' : 'positive'}
        />

        <StatCard
          label="Monthly Income"
          value={kpis.monthlyIncomeFormatted || '₹0.00'}
          subtext="Total earnings this month"
          icon={TrendingUp}
          iconBg="rgba(16, 185, 129, 0.15)"
          iconColor="var(--color-income)"
          trend={summary?.monthOverMonth?.incomeChangePercentage ? `${summary.monthOverMonth.incomeChangePercentage}% MoM` : null}
          trendType={summary?.monthOverMonth?.incomeChangePercentage >= 0 ? 'positive' : 'negative'}
        />

        <StatCard
          label="Monthly Expenses"
          value={kpis.monthlyExpenseFormatted || '₹0.00'}
          subtext="Total spending this month"
          icon={TrendingDown}
          iconBg="rgba(244, 63, 94, 0.15)"
          iconColor="var(--color-expense)"
          trend={summary?.monthOverMonth?.expenseChangePercentage ? `${summary.monthOverMonth.expenseChangePercentage}% MoM` : null}
          trendType={summary?.monthOverMonth?.expenseChangePercentage <= 0 ? 'positive' : 'negative'}
        />

        {(kpis.netSavings || 0) < 0 ? (
          <StatCard
            label="Net Deficit"
            value={kpis.netSavingsFormatted || '₹0.00'}
            valueColor="var(--color-expense)"
            subtext="Expenses exceed income"
            icon={TrendingDown}
            iconBg="rgba(244, 63, 94, 0.15)"
            iconColor="var(--color-expense)"
            trend="Monthly Deficit"
            trendType="negative"
          />
        ) : (
          <StatCard
            label="Net Savings"
            value={kpis.netSavingsFormatted || '₹0.00'}
            subtext={`Savings Rate: ${kpis.savingsRate || 0}%`}
            icon={PiggyBank}
            iconBg="rgba(99, 102, 241, 0.15)"
            iconColor="var(--color-transfer)"
            trend={kpis.savingsRate ? `${kpis.savingsRate}% saved` : null}
            trendType={kpis.savingsRate >= 20 ? 'positive' : 'neutral'}
          />
        )}
      </div>

      {/* Main Grid: Cash Flow Trend & Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Cash Flow History Card */}
        <Card title="6-Month Cash Flow Trend" subtitle="Income vs Expense historical comparison">
          {cashFlowTrend.length === 0 ? (
            <EmptyState title="No historical trend data" description="Record income and expenses to see your cash flow charts." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {cashFlowTrend.map((m) => {
                const maxVal = Math.max(...cashFlowTrend.map((x) => Math.max(x.income, x.expense, 1)));
                const incPercent = Math.min(100, Math.round((m.income / maxVal) * 100));
                const expPercent = Math.min(100, Math.round((m.expense / maxVal) * 100));

                return (
                  <div key={m.month} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                      <span style={{ fontWeight: 600 }}>{m.label}</span>
                      <span style={{ color: (m.netSavings ?? m.savings ?? 0) >= 0 ? 'var(--color-income)' : 'var(--color-expense)', fontWeight: 600, fontSize: '0.75rem' }}>
                        {(m.netSavingsFormatted || m.savingsFormatted) ? `Net: ${m.netSavingsFormatted || m.savingsFormatted}` : ''}
                      </span>
                    </div>

                    {/* Bar visualization */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '45px', fontSize: '0.6875rem', color: 'var(--color-income)' }}>In</div>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-body)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${incPercent}%`, height: '100%', background: 'var(--color-income)', borderRadius: '4px' }} />
                        </div>
                        <div style={{ width: '70px', fontSize: '0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {m.incomeFormatted}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '45px', fontSize: '0.6875rem', color: 'var(--color-expense)' }}>Out</div>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-body)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${expPercent}%`, height: '100%', background: 'var(--color-expense)', borderRadius: '4px' }} />
                        </div>
                        <div style={{ width: '70px', fontSize: '0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                          {m.expenseFormatted}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Category Spending Breakdown Card */}
        <Card title="Spending by Category" subtitle="Top expense categories this month">
          {categoryBreakdown.length === 0 ? (
            <EmptyState
              icon={PieChart}
              title="No expenses recorded"
              description="You haven't recorded any expenses for this month yet."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {categoryBreakdown.map((cat) => (
                <div key={cat.categoryId || cat.name}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: cat.color || 'var(--color-primary)'
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{cat.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{cat.formattedAmount}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right' }}>
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  <div style={{ height: '8px', background: 'var(--bg-body)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${cat.percentage}%`,
                        height: '100%',
                        background: cat.color || 'var(--color-primary)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Grid: Active Budgets & Recent Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
        {/* Budgets Card */}
        <Card title="Active Budgets" subtitle="Monthly limit vs actual spend">
          {budgets.length === 0 ? (
            <EmptyState title="No budgets set" description="Set category budgets to control your monthly spending." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              {budgets.map((b) => {
                let badgeVariant = 'income';
                if (b.status === 'WARNING') badgeVariant = 'warning';
                if (b.status === 'EXCEEDED') badgeVariant = 'expense';

                return (
                  <div key={b._id} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{b.categoryId?.name || 'Budget'}</span>
                        <Badge variant={badgeVariant} size="sm">
                          {b.status}
                        </Badge>
                      </div>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {b.spentFormatted} of {b.limitFormatted}
                      </span>
                    </div>

                    <div style={{ height: '8px', background: 'var(--bg-body)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(b.percentage, 100)}%`,
                          height: '100%',
                          background:
                            b.status === 'EXCEEDED'
                              ? 'var(--color-expense)'
                              : b.status === 'WARNING'
                              ? 'var(--color-warning)'
                              : 'var(--color-income)',
                          borderRadius: 'var(--radius-full)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent 10 Transactions Card */}
        <Card title="Recent Transactions" subtitle="Latest movements across all accounts">
          {recentTransactions.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No transactions yet"
              description="Record your first income, expense, or transfer."
              actionText="Add Transaction"
              onAction={onOpenNewTransaction}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentTransactions.slice(0, 7).map((tx) => {
                const isIncome = tx.type === 'INCOME';
                const isExpense = tx.type === 'EXPENSE';
                const isTransfer = tx.type === 'TRANSFER';

                let Icon = ArrowLeftRight;
                let iconColor = 'var(--color-transfer)';
                let iconBg = 'var(--color-transfer-bg)';
                let sign = '';

                if (isIncome) {
                  Icon = ArrowUpRight;
                  iconColor = 'var(--color-income)';
                  iconBg = 'var(--color-income-bg)';
                  sign = '+';
                } else if (isExpense) {
                  Icon = ArrowDownRight;
                  iconColor = 'var(--color-expense)';
                  iconBg = 'var(--color-expense-bg)';
                  sign = '-';
                }

                return (
                  <div
                    key={tx._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.625rem 0',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: 'var(--radius-md)',
                          background: iconBg,
                          color: iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tx.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {tx.categoryId?.name || (isTransfer ? 'Transfer' : 'General')} •{' '}
                          {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          fontFamily: 'Outfit, sans-serif',
                          color: isIncome ? 'var(--color-income)' : isExpense ? 'var(--color-expense)' : 'var(--text-primary)'
                        }}
                      >
                        {sign}
                        {tx.formattedAmount}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {tx.accountId?.name || tx.fromAccountId?.name || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
