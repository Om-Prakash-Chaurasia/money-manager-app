import { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../../components/ui/index.js';
import { transactionsApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';

export const EditTransactionModal = ({
  isOpen,
  onClose,
  transaction,
  accounts = [],
  categories = [],
  onSuccess
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.majorAmount?.toString() || (transaction.amount / 100).toString());
      setDescription(transaction.description || '');
      setNote(transaction.note || '');
      setDate(transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '');
      setAccountId(transaction.accountId?._id || transaction.accountId || '');
      setCategoryId(transaction.categoryId?._id || transaction.categoryId || '');
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const isTransfer = transaction.type === 'TRANSFER';
  const filteredCategories = categories.filter((c) => c.type === transaction.type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showToast('Please enter a valid amount greater than 0', 'warning');
      return;
    }
    if (!description.trim()) {
      showToast('Description is required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: Number(amount),
        description: description.trim(),
        note: note.trim(),
        date: new Date(date).toISOString()
      };

      if (!isTransfer) {
        payload.accountId = accountId;
        payload.categoryId = categoryId;
      }

      await transactionsApi.update(transaction._id || transaction.id, payload);
      showToast('Transaction updated & ledger balances recalculated atomically', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${transaction.type.charAt(0) + transaction.type.slice(1).toLowerCase()} Transaction`}
      size="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Description / Payee"
          placeholder="e.g., Grocery Mart, Salary, Electric Bill"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {!isTransfer && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={accounts.map((acc) => ({
                value: acc._id || acc.id,
                label: `${acc.name} (${acc.type})`
              }))}
              required
            />

            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={filteredCategories.map((cat) => ({
                value: cat._id || cat.id,
                label: cat.name
              }))}
              required
            />
          </div>
        )}

        {isTransfer && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)'
            }}
          >
            Transfer route: <strong>{transaction.fromAccountId?.name || 'Source'}</strong> →{' '}
            <strong>{transaction.toAccountId?.name || 'Destination'}</strong>
            <br />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              (To change transfer accounts, delete this transfer and create a new one to preserve audit integrity)
            </span>
          </div>
        )}

        <Input
          label="Notes (Optional)"
          placeholder="Additional remarks or tags..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            borderLeft: '2px solid var(--color-primary)',
            paddingLeft: '0.5rem',
            marginTop: '0.25rem'
          }}
        >
          Editing recalculates your account balance atomically via double-entry balance reversal.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
