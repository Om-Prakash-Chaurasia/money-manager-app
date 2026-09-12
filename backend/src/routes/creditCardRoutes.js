import express from 'express';
import { creditCardController } from '../controllers/creditCardController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createCreditCardSchema,
  updateCreditCardSchema,
  createStatementSchema,
  creditCardPaymentSchema
} from '../validators/creditCardValidator.js';

const router = express.Router();

// All credit card routes require authentication
router.use(protect);

router.post('/', validate(createCreditCardSchema), creditCardController.createCreditCard);
router.get('/', creditCardController.getCreditCards);
router.get('/:id', creditCardController.getCreditCardById);
router.patch('/:id', validate(updateCreditCardSchema), creditCardController.updateCreditCard);
router.delete('/:id', creditCardController.deleteCreditCard);

// Statement and Payment endpoints
router.get('/:id/outstanding', creditCardController.getOutstanding);
router.get('/:id/statements', creditCardController.getStatements);
router.post('/:id/statements', validate(createStatementSchema), creditCardController.createStatement);
router.post('/:id/payment', validate(creditCardPaymentSchema), creditCardController.payCreditCardBill);

export default router;
