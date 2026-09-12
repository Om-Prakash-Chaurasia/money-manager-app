import { useState, useEffect } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Upload, X } from 'lucide-react';
import { transactionsApi, transfersApi, accountsApi, categoriesApi, attachmentsApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Modal, Button, Input, Select } from '../ui/index.js';

export const NewTransactionModal = ({ isOpen, onClose, onSuccess }) => {
  const [type, setType] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME' | 'TRANSFER'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchFormOptions();
    }
  }, [isOpen]);

  const fetchFormOptions = async () => {
    setFetchingOptions(true);
    try {
      const [accRes, catRes] = await Promise.all([
        accountsApi.getAll(),
        categoriesApi.getAll({ format: 'flat' })
      ]);

      const accList = accRes?.data?.accounts || accRes?.data || [];
      const catList = catRes?.data?.categories || catRes?.data || [];

      setAccounts(accList);
      setCategories(catList);

      if (accList.length > 0 && !accountId) {
        setAccountId(accList[0]._id);
        setFromAccountId(accList[0]._id);
        if (accList.length > 1) {
          setToAccountId(accList[1]._id);
        }
      }
    } catch (err) {
      showToast('Failed to load accounts and categories', 'error');
    } finally {
      setFetchingOptions(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Please enter a valid amount greater than 0', 'warning');
      return;
    }

    setLoading(true);

    try {
      let createdTxId = null;

      if (type === 'TRANSFER') {
        if (!fromAccountId || !toAccountId) {
          showToast('Please select both source and destination accounts', 'warning');
          setLoading(false);
          return;
        }
        if (fromAccountId === toAccountId) {
          showToast('Source and destination accounts must be different', 'warning');
          setLoading(false);
          return;
        }

        const res = await transfersApi.create({
          fromAccountId,
          toAccountId,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
          description: description || 'Account Transfer',
          note
        });
        createdTxId = res?.data?.transaction?._id;
        showToast('Transfer completed successfully!', 'success');
      } else {
        if (!accountId) {
          showToast('Please select an account', 'warning');
          setLoading(false);
          return;
        }
        if (!categoryId && filteredCategories.length > 0) {
          showToast('Please select a category', 'warning');
          setLoading(false);
          return;
        }

        const res = await transactionsApi.create({
          type,
          amount: parseFloat(amount),
          accountId,
          categoryId: categoryId || filteredCategories[0]?._id,
          date: new Date(date).toISOString(),
          description: description || `${type === 'INCOME' ? 'Income' : 'Expense'} Entry`,
          note
        });
        createdTxId = res?.data?.transaction?._id;
        showToast('Transaction recorded successfully!', 'success');
      }

      // If a receipt file was selected, upload and link it
      if (selectedFile && createdTxId) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('transactionId', createdTxId);
        try {
          await attachmentsApi.uploadSingle(formData);
          showToast('Receipt attached to transaction', 'info');
        } catch (attErr) {
          showToast(`Transaction saved, but receipt upload failed: ${attErr.message}`, 'warning');
        }
      }

      // Reset and close
      setAmount('');
      setDescription('');
      setNote('');
      setSelectedFile(null);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record New Transaction"
      maxWidth="560px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Save Transaction
          </Button>
        </>
      }
    >
      {/* Transaction Type Segmented Toggle */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.5rem',
          background: 'var(--bg-body)',
          padding: '0.375rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <button
          type="button"
          onClick={() => setType('EXPENSE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            padding: '0.625rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            background: type === 'EXPENSE' ? 'var(--color-expense-bg)' : 'transparent',
            color: type === 'EXPENSE' ? 'var(--color-expense)' : 'var(--text-secondary)',
            borderBottom: type === 'EXPENSE' ? '2px solid var(--color-expense)' : '2px solid transparent'
          }}
        >
          <ArrowDownRight size={16} />
          Expense
        </button>

        <button
          type="button"
          onClick={() => setType('INCOME')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            padding: '0.625rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            background: type === 'INCOME' ? 'var(--color-income-bg)' : 'transparent',
            color: type === 'INCOME' ? 'var(--color-income)' : 'var(--text-secondary)',
            borderBottom: type === 'INCOME' ? '2px solid var(--color-income)' : '2px solid transparent'
          }}
        >
          <ArrowUpRight size={16} />
          Income
        </button>

        <button
          type="button"
          onClick={() => setType('TRANSFER')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            padding: '0.625rem',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            background: type === 'TRANSFER' ? 'var(--color-transfer-bg)' : 'transparent',
            color: type === 'TRANSFER' ? 'var(--color-transfer)' : 'var(--text-secondary)',
            borderBottom: type === 'TRANSFER' ? '2px solid var(--color-transfer)' : '2px solid transparent'
          }}
        >
          <ArrowLeftRight size={16} />
          Transfer
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Amount Input */}
        <Input
          label="Amount (in primary currency)"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus
        />

        {/* Description */}
        <Input
          label="Description / Payee"
          type="text"
          placeholder="e.g. Groceries at Supermarket, Salary, etc."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Dynamic Account Selectors */}
        {type === 'TRANSFER' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="From Account"
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              options={accounts.map((a) => ({ value: a._id, label: `${a.name} (${a.type})` }))}
              required
            />
            <Select
              label="To Account"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              options={accounts.map((a) => ({ value: a._id, label: `${a.name} (${a.type})` }))}
              required
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={accounts.map((a) => ({ value: a._id, label: `${a.name} (${a.type})` }))}
              required
            />
            <Select
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={filteredCategories.map((c) => ({ value: c._id, label: c.name }))}
              required
            />
          </div>
        )}

        {/* Date and Optional Note */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Transaction Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Optional Note"
            type="text"
            placeholder="Tags, invoice #, etc."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Optional Receipt Attachment Upload */}
        <div className="input-group">
          <label className="input-label">Attach Receipt / Invoice (Optional)</label>
          <div
            style={{
              border: '1px dashed var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-body)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <Upload size={18} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8125rem', color: selectedFile ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFile ? selectedFile.name : 'Upload JPG, PNG, WebP or PDF (Max 5MB)'}
              </span>
            </div>

            {selectedFile ? (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="btn-ghost"
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-expense)' }}
                aria-label="Remove attached file"
              >
                <X size={16} />
              </button>
            ) : (
              <label
                style={{
                  cursor: 'pointer',
                  padding: '0.25rem 0.625rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-surface-elevated)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)'
                }}
              >
                Browse
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
