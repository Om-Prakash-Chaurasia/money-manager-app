import { useState } from 'react';
import { Modal, Input, Select, Button } from '../../components/ui/index.js';
import { accountsApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';

const COLOR_PRESETS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
  '#64748B'  // Slate
];

const ICONS = [
  { value: 'landmark', label: 'Landmark / Bank' },
  { value: 'wallet', label: 'Cash Wallet' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'piggy-bank', label: 'Piggy Bank / Savings' },
  { value: 'coins', label: 'Coins' },
  { value: 'trending-up', label: 'Investments / Stocks' }
];

export const NewAccountModal = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [subType, setSubType] = useState('SAVINGS');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [currency, setCurrency] = useState('INR');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [icon, setIcon] = useState('landmark');
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Account name is required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await accountsApi.create({
        name: name.trim(),
        type,
        subType,
        openingBalance: Number(openingBalance) || 0,
        currency,
        color,
        icon
      });

      showToast(`Account "${name}" created successfully`, 'success');
      setName('');
      setOpeningBalance('0');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Account" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Input
          label="Account Name"
          placeholder="e.g. HDFC Salary, SBI Savings, Cash Wallet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Select
            label="Account Classification"
            value={type}
            onChange={(e) => {
              const newType = e.target.value;
              setType(newType);
              if (newType === 'BANK') {
                setSubType('SAVINGS');
                setIcon('landmark');
              } else if (newType === 'CASH') {
                setSubType('WALLET');
                setIcon('wallet');
              } else if (newType === 'CREDIT_CARD') {
                setSubType('CREDIT_CARD');
                setIcon('credit-card');
              } else {
                setSubType('OTHER');
                setIcon('trending-up');
              }
            }}
            options={[
              { value: 'BANK', label: 'Bank Account' },
              { value: 'CASH', label: 'Cash Wallet' },
              { value: 'CREDIT_CARD', label: 'Credit Card' },
              { value: 'OTHER', label: 'Asset / Investment / Other' }
            ]}
          />

          <Select
            label="Sub Type"
            value={subType}
            onChange={(e) => setSubType(e.target.value)}
            options={
              type === 'BANK'
                ? [
                    { value: 'SAVINGS', label: 'Savings' },
                    { value: 'CHECKING', label: 'Checking / Current' },
                    { value: 'SALARY', label: 'Salary Account' }
                  ]
                : type === 'CASH'
                ? [
                    { value: 'WALLET', label: 'Physical Wallet' },
                    { value: 'DRAWER', label: 'Cash Drawer / Safe' }
                  ]
                : type === 'CREDIT_CARD'
                ? [{ value: 'CREDIT_CARD', label: 'Credit Card Backing' }]
                : [
                    { value: 'INVESTMENT', label: 'Investment Portfolio' },
                    { value: 'CRYPTO', label: 'Crypto Wallet' },
                    { value: 'OTHER', label: 'Other Asset' }
                  ]
            }
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Opening Balance"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />

          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { value: 'INR', label: 'INR (₹) - Indian Rupee' },
              { value: 'USD', label: 'USD ($) - US Dollar' },
              { value: 'EUR', label: 'EUR (€) - Euro' },
              { value: 'GBP', label: 'GBP (£) - British Pound' }
            ]}
          />
        </div>

        {/* Color Picker Swatches */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Account Accent Color
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform var(--transition-fast)'
                }}
              />
            ))}
          </div>
        </div>

        <Select
          label="Icon Indicator"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          options={ICONS}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            Create Account
          </Button>
        </div>
      </form>
    </Modal>
  );
};
