const pool = require('../db');

const createPayment = async (payment) => {
    const {id, customerName, amount, billType} = payment;
    await pool.query(`INSERT INTO payments (id, customer_name, amount, bill_type)
                      VALUES ($1, $2, $3, $4)`, [id, customerName, amount, billType]);
    return {paymentId: id, customerName, amount, billType};
};

const getAllPayments = async () => {
    const result = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
    return result.rows;
};

const getPaymentById = async (id) => {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    return result.rows[0] ?? null;
};


const updatePayment = async (id, amount, billType) => {
    const update = await pool.query(`UPDATE payments
                                     SET amount    = COALESCE($1, amount),
                                         bill_type = COALESCE($2, bill_type)
                                     WHERE id = $3
                                       AND status = 'pending' RETURNING *`, [amount ?? null, billType ?? null, id]);

    if (update.rows.length > 0) return {type: 'updated', payment: update.rows[0]};
    const result = await pool.query('SELECT id, status FROM payments WHERE id = $1', [id]);

    if (result.rows.length === 0) return {type: 'not_found'};
    return {type: 'not_pending'};
};

module.exports = {createPayment, getAllPayments, getPaymentById, updatePayment};
