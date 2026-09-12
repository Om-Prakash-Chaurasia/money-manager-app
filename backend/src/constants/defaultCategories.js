export const DEFAULT_CATEGORIES = [
  // Income Categories
  {
    name: 'Salary',
    type: 'INCOME',
    icon: 'briefcase',
    color: '#10B981',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Freelancing',
    type: 'INCOME',
    icon: 'laptop',
    color: '#059669',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Business Income',
    type: 'INCOME',
    icon: 'trending-up',
    color: '#047857',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Interest & Dividends',
    type: 'INCOME',
    icon: 'percent',
    color: '#14B8A6',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Other Income',
    type: 'INCOME',
    icon: 'plus-circle',
    color: '#06B6D4',
    isDefault: true,
    subcategories: []
  },

  // Expense Categories with Hierarchies
  {
    name: 'Food & Dining',
    type: 'EXPENSE',
    icon: 'utensils',
    color: '#F59E0B',
    isDefault: true,
    subcategories: [
      { name: 'Groceries', icon: 'shopping-cart', color: '#FBBF24' },
      { name: 'Restaurants', icon: 'coffee', color: '#D97706' },
      { name: 'Food Delivery', icon: 'truck', color: '#B45309' }
    ]
  },
  {
    name: 'Transportation',
    type: 'EXPENSE',
    icon: 'car',
    color: '#3B82F6',
    isDefault: true,
    subcategories: [
      { name: 'Fuel', icon: 'fuel', color: '#60A5FA' },
      { name: 'Public Transit / Metro', icon: 'bus', color: '#2563EB' },
      { name: 'Taxi & Rideshare', icon: 'navigation', color: '#1D4ED8' }
    ]
  },
  {
    name: 'Housing & Rent',
    type: 'EXPENSE',
    icon: 'home',
    color: '#8B5CF6',
    isDefault: true,
    subcategories: [
      { name: 'Rent / Mortgage', icon: 'key', color: '#A78BFA' },
      { name: 'Maintenance', icon: 'tool', color: '#7C3AED' }
    ]
  },
  {
    name: 'Utilities',
    type: 'EXPENSE',
    icon: 'zap',
    color: '#EC4899',
    isDefault: true,
    subcategories: [
      { name: 'Electricity', icon: 'activity', color: '#F472B6' },
      { name: 'Water', icon: 'droplet', color: '#DB2777' },
      { name: 'Gas', icon: 'flame', color: '#BE185D' }
    ]
  },
  {
    name: 'Internet & Mobile',
    type: 'EXPENSE',
    icon: 'wifi',
    color: '#6366F1',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Shopping',
    type: 'EXPENSE',
    icon: 'shopping-bag',
    color: '#EF4444',
    isDefault: true,
    subcategories: [
      { name: 'Clothing', icon: 'tag', color: '#F87171' },
      { name: 'Electronics', icon: 'smartphone', color: '#DC2626' }
    ]
  },
  {
    name: 'Entertainment',
    type: 'EXPENSE',
    icon: 'film',
    color: '#F97316',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Healthcare & Medical',
    type: 'EXPENSE',
    icon: 'heart-pulse',
    color: '#10B981',
    isDefault: true,
    subcategories: [
      { name: 'Doctor & Pharmacy', icon: 'pill', color: '#34D399' },
      { name: 'Health Insurance', icon: 'shield', color: '#059669' }
    ]
  },
  {
    name: 'Education',
    type: 'EXPENSE',
    icon: 'book-open',
    color: '#0EA5E9',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Subscriptions',
    type: 'EXPENSE',
    icon: 'repeat',
    color: '#84CC16',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Travel & Vacations',
    type: 'EXPENSE',
    icon: 'plane',
    color: '#14B8A6',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Personal Care',
    type: 'EXPENSE',
    icon: 'smile',
    color: '#A855F7',
    isDefault: true,
    subcategories: []
  },
  {
    name: 'Other Expense',
    type: 'EXPENSE',
    icon: 'more-horizontal',
    color: '#64748B',
    isDefault: true,
    subcategories: []
  }
];
