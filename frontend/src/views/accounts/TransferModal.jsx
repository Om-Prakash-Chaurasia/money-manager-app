import { useState } from 'react';
import { Modal, Input, Select, Button } from '../../components/ui/index.js';
import { transfersApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ArrowLeftRight } from 'lucide-react';

export const TransferModal = ({ isOpen, onClose, accounts = [], onSuccess }) => {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('Account Fund Transfer');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) {
      showToast('Please select both source and destination accounts', 'warning');
      return;
    }
    if (fromAccountId === toAccountId) {
      showToast('Source and destination accounts must be different', 'warning');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showToast('Please specify a valid transfer amount', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await transfersApi.create({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        date: new Date(date).toISOString(),
        description: description.trim()
      });

      showToast('Transfer completed atomically with zero expense inflation', 'success');
      setAmount('');
      setDescription('Account Fund Transfer');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to complete transfer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Between Accounts" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Select
            label="From (Source Account)"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            options={[
              { value: '', label: 'Select Source...' },
              ...accounts.map((a) => ({
                value: a._id || a.id,
                label: `${a.name} (${a.formattedBalance || a.type})`
              }))
            ]}
            required
          />

          <Select
            label="To (Destination Account)"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            options={[
              { value: '', label: 'Select Destination...' },
              ...accounts
                .filter((a) => (a._id || a.id) !== fromAccountId)
                .map((a) => ({
                  value: a._id || a.id,
                  label: `${a.name} (${a.formattedBalance || a.type})`
                }))
            ]}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Transfer Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Description / Purpose"
          placeholder="e.g., Monthly Savings Allocation, Cash ATM Withdrawal"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ArrowLeftRight size={18} style={{ flexShrink: 0 }} />
          <span>
            Double-entry transfers deduct from the source and credit the destination simultaneously. They do not affect income or expense metrics.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            Execute Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};
