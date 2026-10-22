const crypto = require('crypto');
const paymentService = require('../services/paymentService');

const createPayment = async (req, res) => {
    if (req.body.customerName === undefined || req.body.billType === undefined || req.body.amount === undefined || typeof req.body.customerName !== "string" || typeof req.body.billType !== "string" || typeof req.body.amount !== "number") return res.status(400).json({message: 'invalid data'});

    const customerName = req.body.customerName.trim();
    const amount = req.body.amount;
    const billType = req.body.billType;

    if (customerName.length === 0 || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({message: 'invalid data'});

    const allowedBillTypes = ['electricity', 'water', 'gas'];
    if (!allowedBillTypes.includes(billType)) {
        return res.status(400).json({
            message: 'Invalid bill type'
        });
    }

    const id = crypto.randomUUID();

    try {
        const userId = req.user.id;
        const payment = await paymentService.createPayment({id, customerName, amount, billType, userId});
        return res.status(201).json(payment);
    } catch (error) {
        console.error('Failed to create payment:', error.message);
        return res.status(500).json({message: 'db error'});
    }
};

const getAllPayments = async (req, res) => {
    try {
        const payments = await paymentService.getAllPayments(req.user.id);
        return res.status(200).json(payments);
    } catch (error) {
        console.error('Failed to fetch payments:', error.message);
        return res.status(500).json({message: 'db error'});
    }
};

const getPaymentById = async (req, res) => {
    try {
        const id_user = req.params.id;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id_user)) {
            return res.status(400).json({message: 'Invalid payment ID'});
        }
        const payment = await paymentService.getPaymentById(id_user, req.user.id);
        if (!payment) return res.status(404).json({message: 'Payment not found'});
        return res.status(200).json(payment);
    } catch (error) {
        console.error('Failed to fetch payments for specific user:', error.message);
        return res.status(500).json({message: 'db error'});
    }
};

const updatePayment = async (req, res) => {
    try {
        const id_user = req.params.id;
        let billType = req.body.billType;
        let amount = req.body.amount;

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id_user)) return res.status(400).json({message: 'Invalid payment ID'});

        if (amount === undefined && billType === undefined) return res.status(400).json({message: 'No fields to update'});
        if ((amount !== undefined && (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0))) return res.status(400).json({message: 'Invalid amount'});

        const allowedBillTypes = ['electricity', 'water', 'gas'];
        if (billType !== undefined && !allowedBillTypes.includes(billType)) return res.status(400).json({message: 'Invalid bill type'});
        const result = await paymentService.updatePayment(id_user, amount, billType, req.user.id);
        if (result.type === 'not_found') return res.status(404).json({message: 'Payment not found'});
        if (result.type === 'not_pending') return res.status(409).json({message: 'Cannot update a payment that is not pending'});
        return res.status(200).json(result.payment);
    } catch (error) {
        console.error('Failed to update payment:', error.message);
        return res.status(500).json({message: 'db error'});
    }
};

module.exports = {createPayment, getAllPayments, getPaymentById, updatePayment};
