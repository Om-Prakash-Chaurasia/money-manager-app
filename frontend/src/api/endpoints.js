import { apiClient } from './client.js';

// Auth APIs
export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (data) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data)
};

// Accounts APIs
export const accountsApi = {
  getAll: (params) => apiClient.get('/accounts', { params }),
  getById: (id) => apiClient.get(`/accounts/${id}`),
  create: (data) => apiClient.post('/accounts', data),
  update: (id, data) => apiClient.patch(`/accounts/${id}`, data),
  delete: (id) => apiClient.delete(`/accounts/${id}`)
};

// Categories APIs
export const categoriesApi = {
  getAll: (params) => apiClient.get('/categories', { params }),
  getById: (id) => apiClient.get(`/categories/${id}`),
  create: (data) => apiClient.post('/categories', data),
  update: (id, data) => apiClient.patch(`/categories/${id}`, data),
  delete: (id) => apiClient.delete(`/categories/${id}`)
};

// Transactions APIs
export const transactionsApi = {
  getAll: (params) => apiClient.get('/transactions', { params }),
  getById: (id) => apiClient.get(`/transactions/${id}`),
  create: (data) => apiClient.post('/transactions', data),
  update: (id, data) => apiClient.put(`/transactions/${id}`, data),
  delete: (id) => apiClient.delete(`/transactions/${id}`)
};

// Transfers APIs
export const transfersApi = {
  getAll: (params) => apiClient.get('/transfers', { params }),
  create: (data) => apiClient.post('/transfers', data)
};

// Credit Cards APIs
export const creditCardsApi = {
  getAll: () => apiClient.get('/credit-cards'),
  getById: (id) => apiClient.get(`/credit-cards/${id}`),
  create: (data) => apiClient.post('/credit-cards', data),
  payBill: (id, data) => apiClient.post(`/credit-cards/${id}/payment`, data),
  generateStatement: (id) => apiClient.post(`/credit-cards/${id}/statement`)
};

// Budgets APIs
export const budgetsApi = {
  getAll: (params) => apiClient.get('/budgets', { params }),
  getSummary: (params) => apiClient.get('/budgets/summary', { params }),
  create: (data) => apiClient.post('/budgets', data),
  update: (id, data) => apiClient.patch(`/budgets/${id}`, data),
  delete: (id) => apiClient.delete(`/budgets/${id}`)
};

// Recurring Transactions APIs
export const recurringApi = {
  getAll: (params) => apiClient.get('/recurring-transactions', { params }),
  create: (data) => apiClient.post('/recurring-transactions', data),
  update: (id, data) => apiClient.patch(`/recurring-transactions/${id}`, data),
  delete: (id) => apiClient.delete(`/recurring-transactions/${id}`)
};

// Dashboard APIs
export const dashboardApi = {
  getSummary: (params) => apiClient.get('/dashboard/summary', { params }),
  getCashFlow: (params) => apiClient.get('/dashboard/cashflow', { params })
};

// Reports APIs
export const reportsApi = {
  getIncomeExpense: (params) => apiClient.get('/reports/income-expense', { params }),
  getCategorySpending: (params) => apiClient.get('/reports/category-spending', { params }),
  getCashFlow: (params) => apiClient.get('/reports/cash-flow', { params }),
  getNetWorth: (params) => apiClient.get('/reports/net-worth', { params }),
  getAccountGrowth: (params) => apiClient.get('/reports/account-growth', { params })
};

// Attachments APIs
export const attachmentsApi = {
  uploadSingle: (formData) =>
    apiClient.post('/attachments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  uploadMultiple: (formData) =>
    apiClient.post('/attachments/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getByTransaction: (txId) => apiClient.get(`/attachments/transaction/${txId}`),
  delete: (id) => apiClient.delete(`/attachments/${id}`)
};

// Export APIs
export const exportApi = {
  transactionsUrl: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return `/api/export/transactions?${query}`;
  },
  accountsUrl: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return `/api/export/accounts?${query}`;
  },
  fullBackup: () => apiClient.get('/export/full-backup')
};
