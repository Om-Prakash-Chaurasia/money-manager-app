import { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Trash2,
  CornerDownRight,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { categoriesApi } from '../../api/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Card, Badge, Button, LoadingSpinner, EmptyState, Modal } from '../../components/ui/index.js';
import { NewCategoryModal } from './NewCategoryModal.jsx';

export const CategoriesView = () => {
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [treeRes, flatRes] = await Promise.all([
        categoriesApi.getAll({ format: 'tree' }),
        categoriesApi.getAll({ format: 'flat', limit: 150 })
      ]);

      if (treeRes?.data) setCategoriesTree(treeRes.data || []);
      if (flatRes?.data) setFlatCategories(flatRes.data || []);
    } catch (err) {
      showToast('Failed to load category hierarchy', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setDeleteLoading(true);
    const id = deletingCategory._id || deletingCategory.id;
    try {
      await categoriesApi.delete(id);
      showToast('Category and subcategories deactivated successfully', 'success');
      setDeletingCategory(null);
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete category', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredTree =
    filterType === 'ALL'
      ? categoriesTree
      : categoriesTree.filter((c) => c.type === filterType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Categories & Subcategories</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Manage hierarchical category trees, parent rollups, icons, and color assignments.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={() => setIsAddOpen(true)}>
          Add Category
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs-container">
        {[
          { id: 'ALL', label: 'All Categories' },
          { id: 'EXPENSE', label: 'Expense Categories' },
          { id: 'INCOME', label: 'Income Categories' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`filter-tab ${filterType === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Categories Tree Grid */}
      {loading ? (
        <LoadingSpinner text="Building 2-level category tree..." />
      ) : filteredTree.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Create your first category or subcategory to classify transactions."
          actionLabel="Add Category"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '1.25rem'
          }}
        >
          {filteredTree.map((parent) => {
            const isIncome = parent.type === 'INCOME';
            const subcategories = parent.subcategories || [];

            return (
              <Card key={parent._id || parent.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Parent Category Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: parent.color || 'var(--color-primary)'
                        }}
                      />
                      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{parent.name}</h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Badge variant={isIncome ? 'income' : 'expense'} size="sm">
                        {parent.type}
                      </Badge>
                      {parent.isDefault && (
                        <Badge variant="neutral" size="sm">
                          Default
                        </Badge>
                      )}
                      {!parent.isDefault && (
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(parent)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-expense)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: 'var(--radius-sm)'
                          }}
                          title="Deactivate Category"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategories Tree Section */}
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Subcategories ({subcategories.length})
                    </div>

                    {subcategories.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No child subcategories nested yet.
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        {subcategories.map((sub) => (
                          <div
                            key={sub._id || sub.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.8125rem',
                              padding: '0.25rem 0',
                              borderBottom: '1px solid rgba(255,255,255,0.03)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <CornerDownRight size={13} style={{ color: 'var(--text-muted)' }} />
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: sub.color || parent.color || 'var(--color-primary)'
                                }}
                              />
                              <span style={{ color: 'var(--text-primary)' }}>{sub.name}</span>
                            </div>

                            {!sub.isDefault && (
                              <button
                                type="button"
                                onClick={() => setDeletingCategory(sub)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-expense)',
                                  cursor: 'pointer',
                                  padding: '0.125rem'
                                }}
                                title="Deactivate Subcategory"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Category Modal */}
      <NewCategoryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        parentCategories={flatCategories}
        onSuccess={fetchCategories}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        title="Deactivate Category"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--color-expense)',
              padding: '0.75rem',
              background: 'rgba(244, 63, 94, 0.1)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <AlertCircle size={24} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem' }}>
              Deactivate <strong>{deletingCategory?.name}</strong>?
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            This category and any nested subcategories will be soft-deleted from new transaction choices. Existing transaction history remains safe and intact.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setDeletingCategory(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={deleteLoading}>
              Deactivate Category
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
