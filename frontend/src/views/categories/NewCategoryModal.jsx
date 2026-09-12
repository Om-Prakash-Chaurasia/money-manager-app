import { useState } from 'react';
import { Modal, Input, Select, Button } from '../../components/ui/index.js';
import { categoriesApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';

const CATEGORY_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B'  // Slate
];

const ICONS = [
  { value: 'folder', label: 'Folder / General' },
  { value: 'shopping-cart', label: 'Shopping / Cart' },
  { value: 'utensils', label: 'Food & Dining' },
  { value: 'home', label: 'Housing & Rent' },
  { value: 'car', label: 'Transport / Fuel' },
  { value: 'film', label: 'Entertainment' },
  { value: 'activity', label: 'Healthcare & Fitness' },
  { value: 'briefcase', label: 'Salary / Work' },
  { value: 'trending-up', label: 'Investments / Dividends' },
  { value: 'gift', label: 'Gifts & Donations' }
];

export const NewCategoryModal = ({ isOpen, onClose, parentCategories = [], onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [parentId, setParentId] = useState('');
  const [icon, setIcon] = useState('folder');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  if (!isOpen) return null;

  const eligibleParents = parentCategories.filter((c) => c.type === type && !c.parentId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Category name is required', 'warning');
      return;
    }

    if (isSubcategory && !parentId) {
      showToast('Please select a parent category for the subcategory', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await categoriesApi.create({
        name: name.trim(),
        type,
        parentId: isSubcategory ? parentId : null,
        icon,
        color
      });

      showToast(`Category "${name}" created successfully`, 'success');
      setName('');
      setIsSubcategory(false);
      setParentId('');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Category" size="md">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Flow Type selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            background: 'var(--bg-surface)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)'
          }}
        >
          {['EXPENSE', 'INCOME'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setParentId('');
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
                      : 'var(--color-expense)'
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
          label="Category Name"
          placeholder="e.g., Groceries, Rent, Streaming, Consulting"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Subcategory Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="isSubcategory"
            checked={isSubcategory}
            onChange={(e) => setIsSubcategory(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="isSubcategory" style={{ fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>
            Nest as a subcategory under an existing parent category
          </label>
        </div>

        {isSubcategory && (
          <Select
            label="Select Parent Category"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            options={[
              { value: '', label: 'Select Parent...' },
              ...eligibleParents.map((p) => ({ value: p._id || p.id, label: p.name }))
            ]}
            required
          />
        )}

        <Select
          label="Icon Identifier"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          options={ICONS}
        />

        {/* Color Presets */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Accent Badge Color
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {CATEGORY_COLORS.map((c) => (
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            Create Category
          </Button>
        </div>
      </form>
    </Modal>
  );
};
