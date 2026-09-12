import { useState } from 'react';
import { Modal, Input, Select, Button } from '../../components/ui/index.js';
import { creditCardsApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';

const CARD_COLORS = [
  '#4F46E5', // Indigo
  '#0F172A', // Midnight Obsidian
  '#059669', // Emerald
  '#D97706', // Gold / Amber
  '#DC2626', // Crimson
  '#7C3AED'  // Violet
];

export const AddCreditCardModal = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [billingCycleDay, setBillingCycleDay] = useState('15');
  const [dueDay, setDueDay] = useState('5');
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Card name is required', 'warning');
      return;
    }
    if (!creditLimit || Number(creditLimit) <= 0) {
      showToast('Please specify a valid sanctioned credit limit', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await creditCardsApi.create({
        name: name.trim(),
        creditLimit: Number(creditLimit),
        billingCycleDay: parseInt(billingCycleDay, 10),
        dueDay: parseInt(dueDay, 10),
        color
      });

      showToast(`Credit card "${name}" configured with auto-provisioned liability ledger`, 'success');
      setName('');
      setCreditLimit('');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add credit card', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Credit Card" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Card Name / Issuer"
          placeholder="e.g. HDFC Regalia, ICICI Amazon Pay, SBI Cashback"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Sanctioned Credit Limit"
          type="number"
          step="1"
          min="1"
          placeholder="e.g. 150000"
          value={creditLimit}
          onChange={(e) => setCreditLimit(e.target.value)}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Billing Statement Day (1-31)"
            type="number"
            min="1"
            max="31"
            value={billingCycleDay}
            onChange={(e) => setBillingCycleDay(e.target.value)}
            required
          />

          <Input
            label="Payment Due Day (1-31)"
            type="number"
            min="1"
            max="31"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            required
          />
        </div>

        {/* Card Styling Gradient */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Card Theme Color
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: c,
                  border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  transform: color === c ? 'scale(1.1)' : 'scale(1)'
                }}
              />
            ))}
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          A linked credit card account will be automatically provisioned on the ledger to record card expenses and track debt in real time.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            Add Card
          </Button>
        </div>
      </form>
    </Modal>
  );
};
