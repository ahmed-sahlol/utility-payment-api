const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const is_auth = require('../middleware/authMiddleware');

router.post('/', is_auth, paymentController.createPayment);

router.get('/', is_auth, paymentController.getAllPayments);

router.get('/:id', is_auth, paymentController.getPaymentById);

router.patch('/:id', is_auth, paymentController.updatePayment);

module.exports = router;
