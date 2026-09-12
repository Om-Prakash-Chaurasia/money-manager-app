import { useState, useEffect } from 'react';
import {
  CreditCard as CreditCardIcon,
  Plus,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Receipt,
  ArrowRight,
  TrendingDown,
  Wifi,
  Cpu
} from 'lucide-react';
import { creditCardsApi, accountsApi } from '../../api/endpoints.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, StatCard, Badge, Button, LoadingSpinner, EmptyState } from '../../components/ui/index.js';
import { AddCreditCardModal } from './AddCreditCardModal.jsx';
import { PayBillModal } from './PayBillModal.jsx';

export const CreditCardsView = () => {
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [payingCard, setPayingCard] = useState(null);
  const [statementLoadingId, setStatementLoadingId] = useState(null);

  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    fetchCardsAndAccounts();
  }, []);

  const fetchCardsAndAccounts = async () => {
    setLoading(true);
    try {
      const [cardsRes, accsRes] = await Promise.all([
        creditCardsApi.getAll(),
        accountsApi.getAll({ limit: 100 })
      ]);
      if (cardsRes?.data) {
        const cardList = Array.isArray(cardsRes.data) ? cardsRes.data : (cardsRes.data.cards || []);
        setCards(cardList);
      }
      if (accsRes?.data) {
        const accList = Array.isArray(accsRes.data) ? accsRes.data : (accsRes.data.accounts || []);
        setAccounts(accList);
      }
    } catch (err) {
      showToast('Failed to load credit cards', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStatement = async (card) => {
    const cardId = card._id || card.id;
    setStatementLoadingId(cardId);
    try {
      const res = await creditCardsApi.generateStatement(cardId);
      showToast('Statement generated successfully', 'success');
      fetchCardsAndAccounts();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate statement', 'error');
    } finally {
      setStatementLoadingId(null);
    }
  };

  // Aggregated metrics across all credit cards
  const totalLimit = cards.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const totalDebt = cards.reduce((sum, c) => {
    const d = c.outstanding !== undefined
      ? c.outstanding
      : (c.accountId?.balance < 0 ? Math.abs(c.accountId.balance) : (c.outstandingBalance || c.currentBalance || 0));
    return sum + d;
  }, 0);
  const totalAvailable = Math.max(0, totalLimit - totalDebt);
  const totalUtilization = totalLimit > 0 ? ((totalDebt / totalLimit) * 100).toFixed(1) : '0.0';

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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Credit Cards & Statements</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Track credit limits, outstanding balances, billing cycles, and settle bills without expense inflation.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setIsAddCardOpen(true)}>
          Add Credit Card
        </Button>
      </div>

      {/* Aggregate Credit Overview Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}
      >
        <StatCard
          title="Total Sanctioned Limit"
          value={`₹${(totalLimit / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Combined credit ceiling"
          icon={CreditCardIcon}
          trend="neutral"
        />
        <StatCard
          title="Total Outstanding Debt"
          value={`₹${(totalDebt / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${totalUtilization}% of credit limit utilized`}
          icon={TrendingDown}
          trend="negative"
        />
        <StatCard
          title="Available Credit"
          value={`₹${(totalAvailable / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Remaining purchasing power"
          icon={ShieldCheck}
          trend="positive"
        />
      </div>

      {/* Credit Cards Grid */}
      {loading ? (
        <LoadingSpinner text="Retrieving credit card accounts and statement cycles..." />
      ) : cards.length === 0 ? (
        <EmptyState
          title="No credit cards configured"
          description="Add your first credit card to manage billing cycles and track available credit in real time."
          actionLabel="Add Credit Card"
          onAction={() => setIsAddCardOpen(true)}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {cards.map((card) => {
            const cardName = card.accountId?.name || 'Credit Card';
            const limit = card.creditLimit || 0;
            const debt = card.outstanding !== undefined
              ? card.outstanding
              : (card.accountId?.balance < 0 ? Math.abs(card.accountId.balance) : (card.currentBalance || card.outstandingBalance || 0));
            const available = card.availableCredit !== undefined ? card.availableCredit : Math.max(0, limit - debt);
            const utilizationPct = card.utilizationPercentage !== undefined
              ? card.utilizationPercentage
              : (limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0);
            const cardId = card._id || card.id;

            const progressColor =
              utilizationPct > 70
                ? 'var(--color-expense)'
                : utilizationPct > 30
                ? 'var(--color-warning)'
                : 'var(--color-income)';

            return (
              <div
                key={cardId}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform var(--transition-fast)'
                }}
                className="hover-card"
              >
                {/* Visual Card Face */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${card.accountId?.color || '#3b82f6'} 0%, #0f172a 100%)`,
                    padding: '1.5rem',
                    color: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '180px'
                  }}
                >
                  {/* Gloss Highlight */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-50%',
                      right: '-20%',
                      width: '200px',
                      height: '200px',
                      background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
                      borderRadius: '50%'
                    }}
                  />

                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                      {cardName}
                    </span>
                    <Wifi size={22} style={{ opacity: 0.85, transform: 'rotate(90deg)' }} />
                  </div>

                  {/* EMV Chip & Masked Number */}
                  <div style={{ margin: '1.25rem 0 0.5rem 0' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '26px',
                        background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                        borderRadius: '4px',
                        marginBottom: '0.75rem',
                        boxShadow: 'inset 0 0 2px rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Cpu size={14} style={{ color: '#78350f' }} />
                    </div>

                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '1rem',
                        letterSpacing: '0.2em',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                      }}
                    >
                      •••• •••• •••• {cardId.slice(-4).toUpperCase()}
                    </div>
                  </div>

                  {/* Card Footer: Holder & Due Day */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <div>
                      <span style={{ opacity: 0.7, textTransform: 'uppercase', fontSize: '0.6875rem' }}>Cardholder</span>
                      <div style={{ fontWeight: 600, letterSpacing: '0.05em' }}>{user?.name || 'VALUED CLIENT'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ opacity: 0.7, textTransform: 'uppercase', fontSize: '0.6875rem' }}>Due Day</span>
                      <div style={{ fontWeight: 600 }}>{card.dueDay}th of month</div>
                    </div>
                  </div>
                </div>

                {/* Card Lower Body: Metrics & Actions */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Credit Utilization Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Credit Utilization:</span>
                      <span style={{ fontWeight: 700, color: progressColor }}>
                        {utilizationPct}% ({card.formattedOutstanding || (debt > 0 ? `₹${(debt / 100).toFixed(2)}` : '₹0.00')})
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
                          width: `${utilizationPct}%`,
                          height: '100%',
                          background: progressColor,
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Limits and Available Numbers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Available Credit</span>
                      <div style={{ fontWeight: 700, color: 'var(--color-income)' }}>
                        {card.formattedAvailableCredit || `₹${(available / 100).toFixed(2)}`}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Total Limit</span>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {card.formattedCreditLimit || `₹${(limit / 100).toFixed(2)}`}
                      </div>
                    </div>
                  </div>

                  {/* Cycle info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <span>Statement Cut: {card.billingCycleDay}th</span>
                    <span>Payment Due: {card.dueDay}th</span>
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      marginTop: '0.5rem'
                    }}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Receipt}
                      loading={statementLoadingId === cardId}
                      onClick={() => handleGenerateStatement(card)}
                    >
                      Statement
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ShieldCheck}
                      onClick={() => setPayingCard(card)}
                    >
                      Pay Bill
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Card Modal */}
      <AddCreditCardModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        onSuccess={fetchCardsAndAccounts}
      />

      {/* Pay Bill Modal */}
      {payingCard && (
        <PayBillModal
          isOpen={Boolean(payingCard)}
          onClose={() => setPayingCard(null)}
          card={payingCard}
          accounts={accounts}
          onSuccess={fetchCardsAndAccounts}
        />
      )}
    </div>
  );
};
