import { useState } from 'react';
import { Modal, Input, Select, Button } from '../../components/ui/index.js';
import { creditCardsApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ShieldCheck } from 'lucide-react';

export const PayBillModal = ({ isOpen, onClose, card, accounts = [], onSuccess }) => {
  const [fromAccountId, setFromAccountId] = useState('');
  const [amount, setAmount] = useState(() => {
    if (!card) return '';
    // If outstanding balance exists, prefill major debt
    const debt = card.outstanding !== undefined
      ? card.outstanding
      : (card.accountId?.balance < 0 ? Math.abs(card.accountId.balance) : (card.currentBalance || card.outstandingBalance || 0));
    return debt > 0 ? (debt / 100).toFixed(2) : '';
  });
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(() => `${card?.accountId?.name || 'Credit Card'} Bill Payment`);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  if (!isOpen || !card) return null;

  const eligibleAccounts = accounts.filter(
    (a) => a.type === 'BANK' || a.type === 'CASH'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromAccountId) {
      showToast('Please select a payment source account (Bank or Cash)', 'warning');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showToast('Please specify a valid payment amount', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await creditCardsApi.payBill(card._id || card.id, {
        fromAccountId,
        amount: Number(amount),
        paymentDate: new Date(date).toISOString(),
        description: description.trim()
      });

      showToast('Credit card bill settled via non-inflating double-entry transfer', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to settle credit card bill', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pay Bill: ${card.accountId?.name || 'Credit Card'}`} size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            padding: '0.875rem 1rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outstanding Debt</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-expense)' }}>
              {card.formattedOutstanding || `₹${(((card.outstanding !== undefined ? card.outstanding : (card.accountId?.balance < 0 ? Math.abs(card.accountId.balance) : (card.currentBalance || card.outstandingBalance || 0)))) / 100).toFixed(2)}`}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sanctioned Limit</span>
            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              ₹{((card.creditLimit || 0) / 100).toFixed(2)}
            </div>
          </div>
        </div>

        <Select
          label="Payment Source (Bank / Cash Account)"
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
          options={[
            { value: '', label: 'Select Bank or Cash Account...' },
            ...eligibleAccounts.map((a) => ({
              value: a._id || a.id,
              label: `${a.name} (Balance: ${a.formattedBalance})`
            }))
          ]}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Payment Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Input
            label="Payment Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            color: 'var(--color-income)'
          }}
        >
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <span>
            Accounting Rule: Card bill payments are double-entry transfers (Bank → Credit Card). They settle your card debt without duplicating expenses.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
