import { creditCardRepository } from '../repositories/creditCardRepository.js';
import { accountRepository } from '../repositories/accountRepository.js';
import { transactionRepository } from '../repositories/transactionRepository.js';
import { runInTransaction } from '../utils/transactionRunner.js';
import { toMinorUnits, toMajorUnits, formatCurrency } from '../utils/currencyHelper.js';
import { ACCOUNT_TYPES, ACCOUNT_SUB_TYPES } from '../constants/accountTypes.js';
import { TRANSACTION_TYPES, STATEMENT_STATUSES } from '../constants/transactionTypes.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';

export const creditCardService = {
  /**
   * Create a new credit card with backing account
   */
  async createCreditCard(userId, data) {
    const { name, creditLimit, billingCycleDay, dueDay, color = '#8B5CF6', icon = 'credit-card', accountId } = data;

    const creditLimitMinor = toMinorUnits(creditLimit);
    let linkedAccountId = accountId;

    return runInTransaction(async (session) => {
      // 1. If no existing account is provided, auto-create a backing account
      if (!linkedAccountId) {
        const backingAccount = await accountRepository.create(
          {
            userId,
            name: name.trim(),
            type: ACCOUNT_TYPES.CREDIT_CARD,
            subType: ACCOUNT_SUB_TYPES.CREDIT_CARD,
            currency: 'INR',
            balance: 0,
            openingBalance: 0,
            color,
            icon,
            isActive: true
          },
          session
        );
        linkedAccountId = backingAccount._id;
      } else {
        // Validate provided account
        const acc = await accountRepository.findByIdAndUserId(linkedAccountId, userId, session);
        if (!acc || !acc.isActive) {
          throw new AppError('Linked credit card account not found or inactive', 404);
        }
        if (acc.type !== ACCOUNT_TYPES.CREDIT_CARD) {
          throw new AppError('Linked account must be of type CREDIT_CARD', 400);
        }

        const existingCard = await creditCardRepository.findByAccountIdAndUserId(linkedAccountId, userId, session);
        if (existingCard) {
          throw new AppError('A credit card is already linked to this account', 409);
        }
      }

      // 2. Create Credit Card record
      const card = await creditCardRepository.create(
        {
          userId,
          accountId: linkedAccountId,
          creditLimit: creditLimitMinor,
          billingCycleDay,
          dueDay,
          isActive: true
        },
        session
      );

      logger.info(`Credit Card created: "${name}" with limit: ${formatCurrency(creditLimitMinor)}`);

      const populated = await creditCardRepository.findByIdAndUserId(card._id, userId, session);
      return creditCardService._formatCard(populated);
    });
  },

  /**
   * List all credit cards for user with outstanding balance and available credit calculations
   */
  async getCreditCards(userId) {
    const cards = await creditCardRepository.findWithFilters(userId, { isActive: true });
    return cards.map((card) => creditCardService._formatCard(card));
  },

  /**
   * Get single credit card details
   */
  async getCreditCardById(userId, creditCardId) {
    const card = await creditCardRepository.findByIdAndUserId(creditCardId, userId);
    if (!card || !card.isActive) {
      throw new AppError('Credit card not found', 404);
    }
    return creditCardService._formatCard(card);
  },

  /**
   * Update credit card details
   */
  async updateCreditCard(userId, creditCardId, data) {
    const card = await creditCardRepository.findByIdAndUserId(creditCardId, userId);
    if (!card || !card.isActive) {
      throw new AppError('Credit card not found', 404);
    }

    const payload = {};
    if (data.creditLimit !== undefined) payload.creditLimit = toMinorUnits(data.creditLimit);
    if (data.billingCycleDay !== undefined) payload.billingCycleDay = data.billingCycleDay;
    if (data.dueDay !== undefined) payload.dueDay = data.dueDay;
    if (data.isActive !== undefined) payload.isActive = data.isActive;

    // Update backing account details if provided
    if (data.name || data.color || data.icon) {
      const accUpdate = {};
      if (data.name) accUpdate.name = data.name.trim();
      if (data.color) accUpdate.color = data.color;
      if (data.icon) accUpdate.icon = data.icon;
      await accountRepository.update(card.accountId._id, userId, accUpdate);
    }

    const updated = await creditCardRepository.update(creditCardId, userId, payload);
    return creditCardService._formatCard(updated);
  },

  /**
   * Soft-delete credit card and backing account
   */
  async deleteCreditCard(userId, creditCardId) {
    const card = await creditCardRepository.findByIdAndUserId(creditCardId, userId);
    if (!card) {
      throw new AppError('Credit card not found', 404);
    }

    await runInTransaction(async (session) => {
      await creditCardRepository.softDelete(creditCardId, userId, session);
      if (card.accountId?._id) {
        await accountRepository.softDelete(card.accountId._id, userId, session);
      }
    });

    return {
      message: 'Credit card and linked account deactivated successfully',
      creditCardId
    };
  },

  /**
   * Get real-time outstanding balance and available credit
   */
  async getOutstanding(userId, creditCardId) {
    const card = await creditCardRepository.findByIdAndUserId(creditCardId, userId);
    if (!card || !card.isActive) {
      throw new AppError('Credit card not found', 404);
    }

    const formatted = creditCardService._formatCard(card);
    return {
      creditCardId: card._id,
      cardName: card.accountId?.name || 'Credit Card',
      creditLimit: formatted.creditLimit,
      outstanding: formatted.outstanding,
      availableCredit: formatted.availableCredit,
      utilizationPercentage: formatted.utilizationPercentage,
      formattedOutstanding: formatted.formattedOutstanding,
      formattedAvailableCredit: formatted.formattedAvailableCredit,
      formattedCreditLimit: formatted.formattedCreditLimit
    };
  },

  /**
   * Generate / record a credit card statement
   */
  async createStatement(userId, creditCardId, data) {
    const card = await creditCardRepository.findByIdAndUserId(creditCardId, userId);
    if (!card || !card.isActive) {
      throw new AppError('Credit card not found', 404);
    }

    const totalMinor = toMinorUnits(data.totalAmount);
    const minMinor = toMinorUnits(data.minimumAmount);

    const statement = await creditCardRepository.createStatement({
      creditCardId,
      userId,
      statementDate: new Date(data.statementDate),
      dueDate: new Date(data.dueDate),
      totalAmount: totalMinor,
      minimumAmount: minMinor,
      paidAmount: 0,
      status: STATEMENT_STATUSES.UNPAID
    });

    return {
      ...statement.toJSON(),
      formattedTotalAmount: formatCurrency(statement.totalAmount),
      formattedMinimumAmount: formatCurrency(statement.minimumAmount),
      formattedPaidAmount: formatCurrency(statement.paidAmount)
    };
  },

  /**
   * Get statements for credit card
   */
  async getStatements(userId, creditCardId) {
    const card = await creditCardRepository.findByIdAndUserId(creditCardId, userId);
    if (!card || !card.isActive) {
      throw new AppError('Credit card not found', 404);
    }

    const statements = await creditCardRepository.findStatements(creditCardId, userId);
    return statements.map((s) => ({
      ...s.toJSON(),
      formattedTotalAmount: formatCurrency(s.totalAmount),
      formattedMinimumAmount: formatCurrency(s.minimumAmount),
      formattedPaidAmount: formatCurrency(s.paidAmount),
      majorTotalAmount: toMajorUnits(s.totalAmount),
      majorMinimumAmount: toMajorUnits(s.minimumAmount),
      majorPaidAmount: toMajorUnits(s.paidAmount)
    }));
  },

  /**
   * Settle credit card bill from bank account.
   * Executed as an atomic TRANSFER (not a double-counted expense).
   */
  async payCreditCardBill(userId, creditCardId, paymentData) {
    const { fromAccountId, amount, date, note, statementId } = paymentData;

    const card = await creditCardRepository.findByIdAndUserId(creditCardId, userId);
    if (!card || !card.isActive) {
      throw new AppError('Credit card not found', 404);
    }

    const bankAccount = await accountRepository.findByIdAndUserId(fromAccountId, userId);
    if (!bankAccount || !bankAccount.isActive) {
      throw new AppError('Source bank account not found or inactive', 404);
    }

    const paymentAmountMinor = toMinorUnits(amount);

    if (bankAccount.balance < paymentAmountMinor) {
      throw new AppError(
        `Insufficient funds in ${bankAccount.name}. Available: ${formatCurrency(bankAccount.balance, bankAccount.currency)}, Required: ${formatCurrency(paymentAmountMinor, bankAccount.currency)}`,
        400
      );
    }

    const cardAccountId = card.accountId._id || card.accountId;
    const paymentDate = date ? new Date(date) : new Date();

    const result = await runInTransaction(async (session) => {
      // 1. Deduct from Bank Account
      await accountRepository.adjustBalance(fromAccountId, userId, -paymentAmountMinor, session);

      // 2. Add to Credit Card Account (paying down the liability)
      await accountRepository.adjustBalance(cardAccountId, userId, +paymentAmountMinor, session);

      // 3. Record TRANSFER transaction
      const transferTx = await transactionRepository.create(
        {
          userId,
          type: TRANSACTION_TYPES.TRANSFER,
          amount: paymentAmountMinor,
          currency: bankAccount.currency,
          date: paymentDate,
          description: `Credit Card Bill Payment - ${card.accountId.name}`,
          note: note || 'Credit card bill settlement',
          fromAccountId: bankAccount._id,
          toAccountId: cardAccountId,
          categoryId: null,
          status: 'COMPLETED',
          isDeleted: false
        },
        session
      );

      // 4. Update Statement if statementId is specified
      let updatedStatement = null;
      if (statementId) {
        const stmt = await creditCardRepository.findStatementById(statementId, creditCardId, userId, session);
        if (stmt) {
          const newPaidAmount = stmt.paidAmount + paymentAmountMinor;
          let newStatus = stmt.status;
          if (newPaidAmount >= stmt.totalAmount) {
            newStatus = STATEMENT_STATUSES.PAID;
          } else if (newPaidAmount > 0) {
            newStatus = STATEMENT_STATUSES.PARTIAL;
          }

          updatedStatement = await creditCardRepository.updateStatement(
            statementId,
            creditCardId,
            userId,
            { paidAmount: newPaidAmount, status: newStatus },
            session
          );
        }
      }

      return { transferTx, updatedStatement };
    });

    logger.info(
      `Credit Card bill paid: ${formatCurrency(paymentAmountMinor)} from "${bankAccount.name}" to "${card.accountId.name}"`
    );

    // Retrieve fresh balances
    const [freshCard, freshBank] = await Promise.all([
      creditCardRepository.findByIdAndUserId(creditCardId, userId),
      accountRepository.findByIdAndUserId(fromAccountId, userId)
    ]);

    const formattedCard = creditCardService._formatCard(freshCard);

    return {
      message: 'Credit card payment executed successfully as a transfer',
      payment: {
        id: result.transferTx._id,
        amount: paymentAmountMinor,
        formattedAmount: formatCurrency(paymentAmountMinor),
        date: result.transferTx.date
      },
      sourceAccount: {
        id: freshBank._id,
        name: freshBank.name,
        newBalance: freshBank.balance,
        formattedBalance: formatCurrency(freshBank.balance, freshBank.currency)
      },
      creditCard: {
        id: freshCard._id,
        name: freshCard.accountId.name,
        newOutstanding: formattedCard.outstanding,
        availableCredit: formattedCard.availableCredit,
        formattedOutstanding: formattedCard.formattedOutstanding,
        formattedAvailableCredit: formattedCard.formattedAvailableCredit
      },
      statement: result.updatedStatement
    };
  },

  /**
   * Helper to format card with outstanding, available credit, and currency strings
   */
  _formatCard(card) {
    const raw = card.toJSON ? card.toJSON() : card;
    const accountBalance = raw.accountId?.balance || 0;

    // Expenses on credit cards reduce account balance below zero (debt).
    // Outstanding liability is Math.abs(min(0, balance)).
    const outstanding = accountBalance < 0 ? Math.abs(accountBalance) : 0;
    const creditLimit = raw.creditLimit || 0;
    const availableCredit = Math.max(0, creditLimit - outstanding);
    const utilizationPercentage = creditLimit > 0 ? Math.round((outstanding / creditLimit) * 100) : 0;

    return {
      ...raw,
      outstanding,
      currentBalance: outstanding,
      outstandingBalance: outstanding,
      availableCredit,
      utilizationPercentage,
      majorCreditLimit: toMajorUnits(creditLimit),
      majorOutstanding: toMajorUnits(outstanding),
      majorAvailableCredit: toMajorUnits(availableCredit),
      formattedCreditLimit: formatCurrency(creditLimit),
      formattedOutstanding: formatCurrency(outstanding),
      formattedAvailableCredit: formatCurrency(availableCredit)
    };
  }
};
