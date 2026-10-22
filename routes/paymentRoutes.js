const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/', paymentController.createPayment);

router.get('/', paymentController.getAllPayments);

router.get('/:id', paymentController.getPaymentById);

router.patch('/:id', paymentController.updatePayment);

module.exports = router;
