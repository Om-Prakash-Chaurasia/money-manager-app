export const ACCOUNT_TYPES = {
  BANK: 'BANK',
  CASH: 'CASH',
  CREDIT_CARD: 'CREDIT_CARD',
  OTHER: 'OTHER'
};

export const ACCOUNT_SUB_TYPES = {
  // Bank sub-types
  SAVINGS: 'SAVINGS',
  CHECKING: 'CHECKING',
  SALARY: 'SALARY',
  CURRENT: 'CURRENT',
  FIXED_DEPOSIT: 'FIXED_DEPOSIT',

  // Cash sub-types
  PHYSICAL_CASH: 'PHYSICAL_CASH',
  WALLET: 'WALLET',

  // Credit Card sub-types
  CREDIT_CARD: 'CREDIT_CARD',

  // Other sub-types
  INVESTMENT: 'INVESTMENT',
  LOAN: 'LOAN',
  OTHER: 'OTHER'
};

export const ACCOUNT_TYPE_LIST = Object.values(ACCOUNT_TYPES);
export const ACCOUNT_SUB_TYPE_LIST = Object.values(ACCOUNT_SUB_TYPES);
