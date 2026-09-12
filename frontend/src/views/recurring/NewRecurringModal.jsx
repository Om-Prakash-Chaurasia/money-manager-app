import { useState } from 'react';
import { Modal, Input, Select, Button } from '../../components/ui/index.js';
import { recurringApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';

export const NewRecurringModal = ({
  isOpen,
  onClose,
  accounts = [],
  categories = [],
  onSuccess
}) => {
  const [type, setType] = useState('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  if (!isOpen) return null;

  const isTransfer = type === 'TRANSFER';
  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      showToast('Template description / payee is required', 'warning');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showToast('Please specify a valid recurrence amount', 'warning');
      return;
    }

    if (!isTransfer) {
      if (!accountId) {
        showToast('Please select a target account', 'warning');
        return;
      }
      if (!categoryId) {
        showToast('Please select a transaction category', 'warning');
        return;
      }
    } else {
      if (!fromAccountId || !toAccountId) {
        showToast('Please select both source and destination accounts for transfer', 'warning');
        return;
      }
      if (fromAccountId === toAccountId) {
        showToast('Source and destination accounts must be different', 'warning');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        type,
        description: description.trim(),
        amount: Number(amount),
        frequency,
        startDate: new Date(startDate).toISOString(),
        note: note.trim()
      };

      if (endDate) {
        payload.endDate = new Date(endDate).toISOString();
      }

      if (!isTransfer) {
        payload.accountId = accountId;
        payload.categoryId = categoryId;
      } else {
        payload.fromAccountId = fromAccountId;
        payload.toAccountId = toAccountId;
      }

      await recurringApi.create(payload);
      showToast('Recurring transaction template created successfully', 'success');
      setDescription('');
      setAmount('');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create recurring template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Recurring Transaction Schedule" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Type Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
            background: 'var(--bg-surface)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)'
          }}
        >
          {['EXPENSE', 'INCOME', 'TRANSFER'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setCategoryId('');
              }}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: type === t ? 'var(--bg-card)' : 'transparent',
                color:
                  type === t
                    ? t === 'INCOME'
                      ? 'var(--color-income)'
                      : t === 'EXPENSE'
                      ? 'var(--color-expense)'
                      : 'var(--color-transfer)'
                    : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: type === t ? 'var(--shadow-sm)' : 'none'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <Input
          label="Description / Schedule Title"
          placeholder="e.g., House Rent, Gym Membership, Monthly Salary"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Select
            label="Recurrence Frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            options={[
              { value: 'DAILY', label: 'Daily (Every 24h)' },
              { value: 'WEEKLY', label: 'Weekly (Every 7 days)' },
              { value: 'MONTHLY', label: 'Monthly (Same day each month)' },
              { value: 'YEARLY', label: 'Yearly (Annually)' }
            ]}
          />
        </div>

        {!isTransfer ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: '', label: 'Select Account...' },
                ...accounts.map((a) => ({ value: a._id || a.id, label: a.name }))
              ]}
              required
            />

            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Select Category...' },
                ...filteredCategories.map((c) => ({ value: c._id || c.id, label: c.name }))
              ]}
              required
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="From Account"
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              options={[
                { value: '', label: 'Select Source...' },
                ...accounts.map((a) => ({ value: a._id || a.id, label: a.name }))
              ]}
              required
            />

            <Select
              label="To Account"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              options={[
                { value: '', label: 'Select Destination...' },
                ...accounts.map((a) => ({ value: a._id || a.id, label: a.name }))
              ]}
              required
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <Input
            label="End Date (Optional)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="No end date"
          />
        </div>

        <Input
          label="Notes (Optional)"
          placeholder="e.g., Auto-debit on 5th of each month"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            Create Schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
};
