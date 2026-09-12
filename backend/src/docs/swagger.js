export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Money Manager API',
    version: '1.0.0',
    description: `
**Money Manager** is a production-grade personal finance backend engine architected on **double-entry ledger principles**.

### Key Architectural Guarantees:
1. **Integer Minor Units Precision**: All monetary values are stored and calculated as 64-bit integer minor units (paise/cents: ₹100.50 = \`10050\`) to completely eliminate IEEE-754 binary floating-point drift.
2. **Double-Entry Balance Adjustments**: Multi-document operations (transfers, card bill payments, balance reversals) are executed with atomic transactions.
3. **Zero Transfer Inflation**: Inter-account transfers credit destination and debit source simultaneously without inflating Income or Expense totals.
4. **Credit Card Debt Management**: Credit card purchases are expenses on the card account; bill payments are transfers (Bank → Card) that settle debt without duplicating expenses.
    `,
    contact: {
      name: 'Money Manager Core Engineering',
      email: 'support@moneymanager.app'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'Default API Base'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT access token in the format: Bearer <token>'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Detailed error description' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '6aa54167a63cda90730dda5d' },
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', example: 'jane@example.com' },
          currency: { type: 'string', example: 'INR' },
          timezone: { type: 'string', example: 'Asia/Kolkata' }
        }
      },
      Account: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6aa54167a63cda90730dda5f' },
          name: { type: 'string', example: 'HDFC Salary Bank' },
          type: { type: 'string', enum: ['BANK', 'CASH', 'CREDIT_CARD', 'OTHER'], example: 'BANK' },
          subType: { type: 'string', example: 'SAVINGS' },
          currency: { type: 'string', example: 'INR' },
          balance: { type: 'integer', description: 'Balance in minor units', example: 12500000 },
          formattedBalance: { type: 'string', example: '₹1,25,000.00' },
          color: { type: 'string', example: '#3B82F6' },
          icon: { type: 'string', example: 'landmark' }
        }
      },
      Transaction: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '6aa54167a63cda90730dda60' },
          type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER'], example: 'EXPENSE' },
          amount: { type: 'integer', description: 'Amount in minor units', example: 155000 },
          formattedAmount: { type: 'string', example: '₹1,550.00' },
          date: { type: 'string', format: 'date-time', example: '2026-09-12T12:00:00.000Z' },
          description: { type: 'string', example: 'Supermarket Groceries' },
          note: { type: 'string', example: 'Weekly provisions' },
          accountId: { type: 'string', example: '6aa54167a63cda90730dda5f' },
          categoryId: { type: 'string', example: '6aa54167a63cda90730dda5e' }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Operational Health Check',
        tags: ['Health'],
        security: [],
        responses: {
          200: {
            description: 'API operational status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Money Manager API is operational' },
                    timestamp: { type: 'string' },
                    environment: { type: 'string', example: 'production' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register new user account',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Jane Doe' },
                  email: { type: 'string', format: 'email', example: 'jane@example.com' },
                  password: { type: 'string', minLength: 8, example: 'Password123' },
                  currency: { type: 'string', default: 'INR', example: 'INR' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User registered with seeded default accounts and categories' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate with email and password',
        tags: ['Authentication'],
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'jane@example.com' },
                  password: { type: 'string', example: 'Password123' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful, returns accessToken and sets refreshToken cookie' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate JWT access token using cryptographic nonce refresh token',
        tags: ['Authentication'],
        responses: {
          200: { description: 'New access token issued' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        tags: ['Authentication'],
        responses: {
          200: { description: 'User profile object' }
        }
      }
    },
    '/accounts': {
      get: {
        summary: 'List user accounts with balance metrics',
        tags: ['Accounts'],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['BANK', 'CASH', 'CREDIT_CARD', 'OTHER'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'List of accounts and portfolio summary' }
        }
      },
      post: {
        summary: 'Create a new account',
        tags: ['Accounts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                  name: { type: 'string', example: 'SBI Savings' },
                  type: { type: 'string', enum: ['BANK', 'CASH', 'CREDIT_CARD', 'OTHER'] },
                  subType: { type: 'string', example: 'SAVINGS' },
                  openingBalance: { type: 'number', description: 'Opening balance in major units', example: 50000 },
                  currency: { type: 'string', default: 'INR' },
                  color: { type: 'string', example: '#10B981' },
                  icon: { type: 'string', example: 'landmark' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Account created with initial ledger balance' }
        }
      }
    },
    '/accounts/{id}': {
      get: {
        summary: 'Get account details by ID',
        tags: ['Accounts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Account details' }, 404: { description: 'Not found' } }
      },
      patch: {
        summary: 'Update account metadata (name, color, icon)',
        tags: ['Accounts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Account updated' } }
      },
      delete: {
        summary: 'Soft-delete / archive an account',
        tags: ['Accounts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Account archived' } }
      }
    },
    '/categories': {
      get: {
        summary: 'Get hierarchical category tree or flat list',
        tags: ['Categories'],
        parameters: [
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['tree', 'flat'], default: 'tree' } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['INCOME', 'EXPENSE'] } }
        ],
        responses: { 200: { description: 'Category tree with nested subcategories' } }
      },
      post: {
        summary: 'Create custom category or subcategory',
        tags: ['Categories'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                  name: { type: 'string', example: 'Organic Produce' },
                  type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                  parentId: { type: 'string', nullable: true },
                  icon: { type: 'string', default: 'folder' },
                  color: { type: 'string', default: '#3B82F6' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Category created' } }
      }
    },
    '/transactions': {
      get: {
        summary: 'List transactions with filtering, date range, and pagination',
        tags: ['Transactions'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER'] } },
          { name: 'accountId', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Paginated transactions list and summary totals' } }
      },
      post: {
        summary: 'Create a transaction and atomically adjust account balance',
        tags: ['Transactions'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'amount', 'date', 'description', 'accountId', 'categoryId'],
                properties: {
                  type: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
                  amount: { type: 'number', description: 'Major currency amount', example: 1250.5 },
                  date: { type: 'string', format: 'date-time' },
                  description: { type: 'string', example: 'Supermarket' },
                  note: { type: 'string' },
                  accountId: { type: 'string' },
                  categoryId: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Transaction recorded and ledger updated' } }
      }
    },
    '/transactions/{id}': {
      put: {
        summary: 'Edit transaction with atomic two-phase balance reversal',
        tags: ['Transactions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Transaction updated and balances recalculated' } }
      },
      delete: {
        summary: 'Delete transaction and atomically restore ledger balance',
        tags: ['Transactions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Transaction deleted and balance restored' } }
      }
    },
    '/transfers': {
      get: {
        summary: 'List inter-account transfers',
        tags: ['Transfers'],
        responses: { 200: { description: 'List of transfers' } }
      },
      post: {
        summary: 'Execute double-entry transfer between two accounts',
        tags: ['Transfers'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fromAccountId', 'toAccountId', 'amount', 'date', 'description'],
                properties: {
                  fromAccountId: { type: 'string' },
                  toAccountId: { type: 'string' },
                  amount: { type: 'number', example: 5000 },
                  date: { type: 'string', format: 'date-time' },
                  description: { type: 'string', example: 'Savings Allocation' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Transfer executed with zero income/expense inflation' } }
      }
    },
    '/credit-cards': {
      get: {
        summary: 'List credit cards with limit and available credit tracking',
        tags: ['Credit Cards'],
        responses: { 200: { description: 'List of credit cards' } }
      },
      post: {
        summary: 'Configure credit card with automated backing ledger account',
        tags: ['Credit Cards'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'creditLimit', 'billingCycleDay', 'dueDay'],
                properties: {
                  name: { type: 'string', example: 'HDFC Regalia' },
                  creditLimit: { type: 'number', example: 150000 },
                  billingCycleDay: { type: 'integer', minimum: 1, maximum: 31, example: 15 },
                  dueDay: { type: 'integer', minimum: 1, maximum: 31, example: 5 },
                  color: { type: 'string', default: '#4F46E5' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Credit card provisioned' } }
      }
    },
    '/credit-cards/{id}/payment': {
      post: {
        summary: 'Settle credit card bill via double-entry transfer',
        tags: ['Credit Cards'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fromAccountId', 'amount'],
                properties: {
                  fromAccountId: { type: 'string', description: 'Bank or cash source account ID' },
                  amount: { type: 'number', example: 18500 },
                  paymentDate: { type: 'string', format: 'date-time' },
                  description: { type: 'string', example: 'HDFC Card Bill Payment' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Card debt settled without expense duplication' } }
      }
    },
    '/budgets': {
      get: {
        summary: 'Get monthly category budgets with dynamic rollups',
        tags: ['Budgets'],
        parameters: [{ name: 'month', in: 'query', schema: { type: 'string', example: '2026-09' } }],
        responses: { 200: { description: 'List of budgets with spending rollups' } }
      },
      post: {
        summary: 'Set category monthly spending limit',
        tags: ['Budgets'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['categoryId', 'amount', 'month'],
                properties: {
                  categoryId: { type: 'string' },
                  amount: { type: 'number', example: 20000 },
                  month: { type: 'string', example: '2026-09' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Budget set' } }
      }
    },
    '/budgets/summary': {
      get: {
        summary: 'Overall monthly budget health summary',
        tags: ['Budgets'],
        parameters: [{ name: 'month', in: 'query', schema: { type: 'string', example: '2026-09' } }],
        responses: { 200: { description: 'Budget count, total spent, and overall status' } }
      }
    },
    '/recurring-transactions': {
      get: {
        summary: 'List recurring transaction schedule templates',
        tags: ['Recurring Transactions'],
        responses: { 200: { description: 'Recurring templates list' } }
      },
      post: {
        summary: 'Create recurring transaction schedule',
        tags: ['Recurring Transactions'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'description', 'amount', 'frequency', 'startDate'],
                properties: {
                  type: { type: 'string', enum: ['INCOME', 'EXPENSE', 'TRANSFER'] },
                  description: { type: 'string', example: 'House Rent' },
                  amount: { type: 'number', example: 35000 },
                  frequency: { type: 'string', enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
                  startDate: { type: 'string', format: 'date-time' },
                  endDate: { type: 'string', format: 'date-time', nullable: true },
                  accountId: { type: 'string' },
                  categoryId: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Schedule configured' } }
      }
    },
    '/dashboard/summary': {
      get: {
        summary: 'High-performance dashboard KPIs, net worth, and recent activity',
        tags: ['Dashboard'],
        parameters: [{ name: 'month', in: 'query', schema: { type: 'string', example: '2026-09' } }],
        responses: { 200: { description: 'Dashboard metrics and historical cashflow trends' } }
      }
    },
    '/reports/income-expense': {
      get: {
        summary: 'Income vs Expense periodic trend report',
        tags: ['Reports'],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'groupBy', in: 'query', schema: { type: 'string', enum: ['month', 'week', 'day'], default: 'month' } }
        ],
        responses: { 200: { description: 'Trend breakdown and savings rate' } }
      }
    },
    '/reports/category-spending': {
      get: {
        summary: 'Category and subcategory allocation report',
        tags: ['Reports'],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['EXPENSE', 'INCOME'], default: 'EXPENSE' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }
        ],
        responses: { 200: { description: 'Ranked category shares' } }
      }
    },
    '/reports/cash-flow': {
      get: {
        summary: 'Operational Cash Flow statement',
        tags: ['Reports'],
        responses: { 200: { description: 'Operating inflows, outflows, and account channels' } }
      }
    },
    '/reports/net-worth': {
      get: {
        summary: 'Historical Net Worth progression and trajectory',
        tags: ['Reports'],
        parameters: [{ name: 'months', in: 'query', schema: { type: 'integer', default: 12 } }],
        responses: { 200: { description: 'Timeline of assets, liabilities, and net worth' } }
      }
    },
    '/attachments/upload': {
      post: {
        summary: 'Upload invoice or receipt attachment (max 5MB)',
        tags: ['Attachments'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  transactionId: { type: 'string', nullable: true }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Receipt uploaded' } }
      }
    },
    '/export/transactions': {
      get: {
        summary: 'Export transactions in RFC 4180 CSV or JSON format',
        tags: ['Export & Backup'],
        parameters: [
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'json'], default: 'csv' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }
        ],
        responses: { 200: { description: 'CSV file with UTF-8 BOM or JSON download' } }
      }
    },
    '/export/accounts': {
      get: {
        summary: 'Export accounts portfolio in CSV or JSON',
        tags: ['Export & Backup'],
        responses: { 200: { description: 'CSV/JSON accounts export' } }
      }
    },
    '/export/full-backup': {
      get: {
        summary: 'Download complete portable financial snapshot (passwords sanitized)',
        tags: ['Export & Backup'],
        responses: { 200: { description: 'Comprehensive JSON backup' } }
      }
    }
  }
};
