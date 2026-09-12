import { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../../components/ui/index.js';
import { budgetsApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';

export const SetBudgetModal = ({
  isOpen,
  onClose,
  categories = [],
  selectedMonth,
  existingBudget = null,
  onSuccess
}) => {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(selectedMonth || '');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    if (existingBudget) {
      setCategoryId(existingBudget.categoryId?._id || existingBudget.categoryId?.id || existingBudget.categoryId || '');
      setAmount(existingBudget.majorAmount?.toString() || (existingBudget.amount / 100).toString());
      setMonth(existingBudget.month || selectedMonth);
    } else {
      setCategoryId(categories.length > 0 ? categories[0]._id || categories[0].id : '');
      setAmount('');
      setMonth(selectedMonth);
    }
  }, [existingBudget, selectedMonth, categories]);

  if (!isOpen) return null;

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId) {
      showToast('Please select an expense category', 'warning');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showToast('Please specify a budget amount greater than 0', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (existingBudget) {
        await budgetsApi.update(existingBudget._id || existingBudget.id, {
          amount: Number(amount),
          month
        });
        showToast('Budget allocation updated successfully', 'success');
      } else {
        await budgetsApi.create({
          categoryId,
          amount: Number(amount),
          month
        });
        showToast('Budget created successfully', 'success');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save budget', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingBudget ? 'Edit Budget Limit' : 'Set Category Budget'}
      size="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Select
          label="Expense Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={expenseCategories.map((c) => ({
            value: c._id || c.id,
            label: c.name
          }))}
          disabled={Boolean(existingBudget)}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Budget Monthly Limit"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Input
            label="Target Month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            required
          />
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Rule: Budgets apply to Expense categories and automatically aggregate all expenses from both the parent category and any child subcategories.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {existingBudget ? 'Update Limit' : 'Set Budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
