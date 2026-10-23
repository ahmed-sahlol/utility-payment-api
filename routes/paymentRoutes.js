const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const is_auth = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Utility bill payment operations
 */

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Create a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - billType
 *               - amount
 *             properties:
 *               billType:
 *                 type: string
 *                 enum: [electricity, water, gas]
 *                 example: electricity
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: 0
 *                 example: 150.5
 *     responses:
 *       '201':
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentId:
 *                   type: string
 *                   format: uuid
 *                 amount:
 *                   type: number
 *                   example: 150.5
 *                 billType:
 *                   type: string
 *                   example: electricity
 *                 status:
 *                   type: string
 *                   example: pending
 *       '400':
 *         description: Invalid payment data or bill type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Authentication required
 *       '500':
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   get:
 *     summary: Get all payments for the authenticated user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 *       '401':
 *         description: Authentication required
 *       '500':
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get a payment by ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the payment
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Payment found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       '400':
 *         description: Invalid payment ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Authentication required
 *       '404':
 *         description: Payment not found for this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   patch:
 *     summary: Update a pending payment
 *     description: Updates the amount, bill type, or both. Only pending payments can be updated.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the payment
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               billType:
 *                 type: string
 *                 enum: [electricity, water, gas]
 *                 example: gas
 *               amount:
 *                 type: number
 *                 exclusiveMinimum: 0
 *                 example: 200
 *     responses:
 *       '200':
 *         description: Payment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       '400':
 *         description: Invalid payment ID, amount, bill type, or empty update
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Authentication required
 *       '404':
 *         description: Payment not found for this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '409':
 *         description: Payment cannot be updated in its current status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: string
 *           example: '200.00'
 *         status:
 *           type: string
 *           enum: [pending, successful, failed, cancelled]
 *           example: pending
 *         created_at:
 *           type: string
 *           format: date-time
 *         bill_type:
 *           type: string
 *           enum: [electricity, water, gas]
 *           example: gas
 *         user_id:
 *           type: string
 *           format: uuid
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Payment not found
 */

router.post('/', is_auth, paymentController.createPayment);
router.get('/', is_auth, paymentController.getAllPayments);
router.get('/:id', is_auth, paymentController.getPaymentById);
router.patch('/:id', is_auth, paymentController.updatePayment);

module.exports = router;
