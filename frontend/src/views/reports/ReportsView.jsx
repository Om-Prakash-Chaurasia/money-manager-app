import { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  FileSpreadsheet,
  FileJson,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Landmark,
  CreditCard
} from 'lucide-react';
import { reportsApi, exportApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, StatCard, Badge, Button, LoadingSpinner, EmptyState, Select, Input } from '../../components/ui/index.js';

export const ReportsView = () => {
  const [activeReport, setActiveReport] = useState('INCOME_EXPENSE');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Filters
  const [groupBy, setGroupBy] = useState('month');
  const [categoryType, setCategoryType] = useState('EXPENSE');
  const [netWorthMonths, setNetWorthMonths] = useState('12');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - 5);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  });

  const { showToast } = useToast();

  useEffect(() => {
    fetchActiveReport();
  }, [activeReport, groupBy, categoryType, netWorthMonths, startDate, endDate]);

  const fetchActiveReport = async () => {
    setLoading(true);
    try {
      let res;
      if (activeReport === 'INCOME_EXPENSE') {
        res = await reportsApi.getIncomeExpense({ startDate, endDate, groupBy });
      } else if (activeReport === 'CATEGORY_SPENDING') {
        res = await reportsApi.getCategorySpending({ startDate, endDate, type: categoryType });
      } else if (activeReport === 'CASH_FLOW') {
        res = await reportsApi.getCashFlow({ startDate, endDate });
      } else if (activeReport === 'NET_WORTH') {
        res = await reportsApi.getNetWorth({ months: parseInt(netWorthMonths, 10) });
      }

      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      showToast('Failed to compute financial report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportTransactionsCSV = () => {
    const url = exportApi.transactionsUrl({ startDate, endDate, format: 'csv' });
    window.open(url, '_blank');
  };

  const handleExportAccountsCSV = () => {
    const url = exportApi.accountsUrl({ format: 'csv' });
    window.open(url, '_blank');
  };

  const handleDownloadFullBackup = async () => {
    try {
      const res = await exportApi.fullBackup();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `money-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Full JSON financial snapshot downloaded successfully', 'success');
    } catch (err) {
      showToast('Failed to generate full data backup', 'error');
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Comprehensive Financial Reports</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Income vs. Expense trends, category allocations, cash flow statements, and net worth trajectory.
          </p>
        </div>

        {/* Export Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={handleExportTransactionsCSV}>
            Transactions (CSV)
          </Button>
          <Button variant="secondary" size="sm" icon={FileSpreadsheet} onClick={handleExportAccountsCSV}>
            Accounts (CSV)
          </Button>
          <Button variant="primary" size="sm" icon={FileJson} onClick={handleDownloadFullBackup}>
            Full Backup (JSON)
          </Button>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-card)',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap'
        }}
      >
        {[
          { id: 'INCOME_EXPENSE', label: 'Income vs Expense Trend', icon: BarChart3 },
          { id: 'CATEGORY_SPENDING', label: 'Category Allocations', icon: PieChart },
          { id: 'CASH_FLOW', label: 'Cash Flow Statement', icon: Layers },
          { id: 'NET_WORTH', label: 'Net Worth Trajectory', icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveReport(tab.id)}
              className={`filter-tab ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Icon size={16} style={{ color: isActive ? 'var(--color-primary)' : 'inherit' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Filter Controls Bar */}
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          {activeReport !== 'NET_WORTH' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap'
                  }}
                >
                  From:
                </span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '150px' }}
                  className="report-filter-input"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap'
                  }}
                >
                  To:
                </span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '150px' }}
                  className="report-filter-input"
                />
              </div>

              {activeReport === 'INCOME_EXPENSE' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                      fontWeight: 500,
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Interval:
                  </span>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.375rem 0.625rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <option value="month">Monthly</option>
                    <option value="week">Weekly</option>
                    <option value="day">Daily</option>
                  </select>
                </div>
              )}

              {activeReport === 'CATEGORY_SPENDING' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-muted)',
                      fontWeight: 500,
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Flow Type:
                  </span>
                  <select
                    value={categoryType}
                    onChange={(e) => setCategoryType(e.target.value)}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.375rem 0.625rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <option value="EXPENSE">Expenses Only</option>
                    <option value="INCOME">Income Only</option>
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap'
                }}
              >
                Time Horizon:
              </span>
              <select
                value={netWorthMonths}
                onChange={(e) => setNetWorthMonths(e.target.value)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.375rem 0.625rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem'
                }}
              >
                <option value="6">Past 6 Months</option>
                <option value="12">Past 12 Months</option>
                <option value="24">Past 24 Months</option>
              </select>
            </div>
          )}

          <Button variant="secondary" size="sm" onClick={fetchActiveReport}>
            Refresh Report
          </Button>
        </div>
      </Card>

      {/* Report Content Body */}
      {loading ? (
        <LoadingSpinner text="Aggregating ledger data & computing report metrics..." />
      ) : !data ? (
        <EmptyState title="No report data available" description="Select a valid date range to compute metrics." />
      ) : (
        <div>
          {/* 1. Income vs Expense Trend */}
          {activeReport === 'INCOME_EXPENSE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <StatCard
                  title="Total Income"
                  value={data.summary?.formattedTotalIncome || '₹0.00'}
                  subtitle="Inflows during period"
                  icon={ArrowDownRight}
                  trend="positive"
                />
                <StatCard
                  title="Total Expenses"
                  value={data.summary?.formattedTotalExpense || '₹0.00'}
                  subtitle="Outflows during period"
                  icon={ArrowUpRight}
                  trend="negative"
                />
                <StatCard
                  title="Net Savings"
                  value={data.summary?.formattedTotalNetSavings || '₹0.00'}
                  subtitle={`Savings rate: ${data.summary?.savingsRate || 0}%`}
                  icon={TrendingUp}
                  trend={data.summary?.totalNetSavings >= 0 ? 'positive' : 'negative'}
                />
              </div>

              {/* Visual Comparative Bars */}
              <Card title="Comparative Period Trend" subtitle="Income vs. Expense over chosen intervals">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '0.5rem' }}>
                  {(data.data || []).map((item) => {
                    const maxVal = Math.max(item.income || 0, item.expense || 0, 1);
                    const incPct = Math.round(((item.income || 0) / maxVal) * 100);
                    const expPct = Math.round(((item.expense || 0) / maxVal) * 100);

                    return (
                      <div key={item.period} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                          <span style={{ fontWeight: 600 }}>{item.period}</span>
                          <span
                            style={{
                              color: item.netSavings >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
                              fontWeight: 600
                            }}
                          >
                            Net: {item.formattedNetSavings || `₹${((item.netSavings || 0) / 100).toFixed(2)}`} (
                            {item.savingsRate}%)
                          </span>
                        </div>

                        {/* Income Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '60px', fontSize: '0.6875rem', color: 'var(--color-income)' }}>
                            Income
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: '8px',
                              background: 'var(--bg-surface)',
                              borderRadius: 'var(--radius-full)',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: `${incPct}%`,
                                height: '100%',
                                background: 'var(--color-income)',
                                borderRadius: 'var(--radius-full)'
                              }}
                            />
                          </div>
                          <span style={{ width: '80px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600 }}>
                            {item.formattedIncome || `₹${((item.income || 0) / 100).toFixed(2)}`}
                          </span>
                        </div>

                        {/* Expense Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '60px', fontSize: '0.6875rem', color: 'var(--color-expense)' }}>
                            Expense
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: '8px',
                              background: 'var(--bg-surface)',
                              borderRadius: 'var(--radius-full)',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: `${expPct}%`,
                                height: '100%',
                                background: 'var(--color-expense)',
                                borderRadius: 'var(--radius-full)'
                              }}
                            />
                          </div>
                          <span style={{ width: '80px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600 }}>
                            {item.formattedExpense || `₹${((item.expense || 0) / 100).toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* 2. Category Allocations */}
          {activeReport === 'CATEGORY_SPENDING' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <StatCard
                  title={`Total ${categoryType === 'EXPENSE' ? 'Expenses' : 'Income'}`}
                  value={data.formattedTotalAmount || `₹${((data.totalAmount || 0) / 100).toFixed(2)}`}
                  subtitle={`Across ${data.categoryCount || 0} active categories`}
                  icon={PieChart}
                  trend="neutral"
                />
              </div>

              <Card title="Category Distribution & Percentage Share" subtitle="Ranked breakdown of spending and inflows">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
                  {(data.categories || []).map((cat, idx) => (
                    <div key={cat.categoryId || idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: cat.color || 'var(--color-primary)'
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{cat.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({cat.transactionCount} transactions)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 700 }}>
                            {cat.formattedAmount || `₹${((cat.totalAmount || 0) / 100).toFixed(2)}`}
                          </span>
                          <Badge variant="primary" size="sm">
                            {cat.percentage}%
                          </Badge>
                        </div>
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
                            width: `${Math.min(100, cat.percentage || 0)}%`,
                            height: '100%',
                            background: cat.color || 'var(--color-primary)',
                            borderRadius: 'var(--radius-full)'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* 3. Cash Flow Statement */}
          {activeReport === 'CASH_FLOW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <StatCard
                  title="Operating Inflows"
                  value={data.summary?.formattedTotalInflows || '₹0.00'}
                  subtitle="Deposits & Earned Income"
                  icon={ArrowDownRight}
                  trend="positive"
                />
                <StatCard
                  title="Operating Outflows"
                  value={data.summary?.formattedTotalOutflows || '₹0.00'}
                  subtitle="Operational & Living Expenses"
                  icon={ArrowUpRight}
                  trend="negative"
                />
                <StatCard
                  title="Net Cash Flow"
                  value={data.summary?.formattedNetCashFlow || '₹0.00'}
                  subtitle="Operating cash surplus / deficit"
                  icon={Layers}
                  trend={data.summary?.netCashFlow >= 0 ? 'positive' : 'negative'}
                />
              </div>

              {/* Payment Channels Breakdown */}
              {data.paymentMethodBreakdown && (
                <Card title="Flow by Account Channel" subtitle="Where cash entered and exited your ledger">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {data.paymentMethodBreakdown.map((pm) => (
                      <div
                        key={pm.accountType}
                        style={{
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.375rem'
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {pm.accountType}
                        </span>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-income)' }}>
                          In: {pm.formattedInflow || `₹${((pm.inflow || 0) / 100).toFixed(2)}`}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-expense)' }}>
                          Out: {pm.formattedOutflow || `₹${((pm.outflow || 0) / 100).toFixed(2)}`}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '0.25rem' }}>
                          Net: {pm.formattedNet || `₹${((pm.net || 0) / 100).toFixed(2)}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* 4. Net Worth Trajectory */}
          {activeReport === 'NET_WORTH' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <StatCard
                  title="Current Net Worth"
                  value={data.summary?.formattedCurrentNetWorth || '₹0.00'}
                  subtitle="Latest ledger balance snapshot"
                  icon={TrendingUp}
                  trend="positive"
                />
                <StatCard
                  title="Trajectory Change"
                  value={data.summary?.formattedChangeAmount || '₹0.00'}
                  subtitle={`${data.summary?.changePercentage || 0}% change over period`}
                  icon={data.summary?.changeAmount >= 0 ? TrendingUp : TrendingDown}
                  trend={data.summary?.changeAmount >= 0 ? 'positive' : 'negative'}
                />
              </div>

              <Card title="Historical Net Worth Progression" subtitle="Monthly balance trajectory computed from ledger math">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--border-card)',
                          background: 'var(--bg-surface)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase'
                        }}
                      >
                        <th style={{ padding: '0.875rem 1rem' }}>Month</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Liquid Assets</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Liabilities</th>
                        <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Net Worth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.timeline || []).map((t) => (
                        <tr key={t.month} style={{ borderBottom: '1px solid var(--border-card)' }}>
                          <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>{t.monthLabel || t.month}</td>
                          <td style={{ padding: '0.875rem 1rem', color: 'var(--color-income)' }}>
                            {t.formattedAssets || `₹${((t.assets || 0) / 100).toFixed(2)}`}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', color: 'var(--color-expense)' }}>
                            {t.formattedLiabilities || `₹${((t.liabilities || 0) / 100).toFixed(2)}`}
                          </td>
                          <td
                            style={{
                              padding: '0.875rem 1rem',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: t.netWorth >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
                            }}
                          >
                            {t.formattedNetWorth || `₹${((t.netWorth || 0) / 100).toFixed(2)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
