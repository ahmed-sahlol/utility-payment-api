const pool = require('../db');

const createPayment = async (payment) => {
    const {id, amount, billType, userId} = payment;
    const result = await pool.query(`INSERT INTO payments (id, amount, bill_type, user_id)
                                     VALUES ($1, $2, $3, $4) RETURNING *`, [id, amount, billType, userId]);
    return {paymentId: id, amount, billType, status: result.rows[0].status};
};


const getAllPayments = async (userId) => {
    const result = await pool.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
};

const getPaymentById = async (id, userId) => {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1 AND user_id =$2', [id, userId]);
    return result.rows[0] ?? null;
};

const updatePayment = async (id, amount, billType, userId) => {
    const update = await pool.query(`UPDATE payments
                                     SET amount    = COALESCE($1, amount),
                                         bill_type = COALESCE($2, bill_type)
                                     WHERE id = $3
                                       AND user_id = $4
                                       AND status = 'pending' RETURNING *`, [amount ?? null, billType ?? null, id, userId]);

    if (update.rows.length > 0) return {type: 'updated', payment: update.rows[0]};
    const result = await pool.query('SELECT id, status FROM payments WHERE id = $1 AND user_id =$2 ', [id, userId]);

    if (result.rows.length === 0) return {type: 'not_found'};
    return {type: 'not_pending'};
};

const simulatePaymentResult = () => {
    const randomNumber = Math.random();
    if (randomNumber < 0.8) return 'successful';
    return 'failed';
};

const finishPaymentProcessing = async (id, userId, newStatus) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`UPDATE payments
                                           SET status     = $1,
                                               updated_at = NOW()
                                           WHERE id = $2
                                             AND user_id = $3
                                             AND status = 'processing' RETURNING *`, [newStatus, id, userId]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return {type: 'not_processing'};
        }

        await client.query(`INSERT INTO payment_status_history (payment_id, old_status, new_status)
                            VALUES ($1, $2, $3)`, [id, 'processing', newStatus]);

        await client.query('COMMIT');

        return {type: 'finished', payment: result.rows[0]};
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const startPaymentProcessing = async (id, userId) => {
    const client = await pool.connect();

    try {
        const newStatus = simulatePaymentResult();
        await client.query('BEGIN');
        const result = await client.query(`
            UPDATE payments
            SET status           = 'processing',
                updated_at       = NOW(),
                simulated_result = $3
            WHERE id = $1
              AND user_id = $2
              AND status = 'pending' RETURNING *
        `, [id, userId, newStatus]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');

            const check = await pool.query('SELECT * FROM payments WHERE id = $1 AND user_id = $2', [id, userId]);

            if (check.rows.length > 0) return {type: 'not_pending'};
            return {type: 'not_found'};
        }

        await client.query(`INSERT INTO payment_status_history (payment_id, old_status, new_status)
                            VALUES ($1, $2, $3)`, [id, 'pending', 'processing']);
        await client.query('COMMIT');
        return {type: 'started', payment: result.rows[0]};
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getStaleProcessingPayments = async () => {
    const result = await pool.query(`
        SELECT id, user_id, status, created_at, updated_at, simulated_result
        FROM payments
        WHERE status = 'processing'
          AND updated_at < NOW() - INTERVAL '5 minutes'
        ORDER BY updated_at ASC
    `);
    return result.rows;
};
const recoverStaleProcessingPayments = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
            SELECT id, user_id, simulated_result
            FROM payments
            WHERE status = 'processing'
              AND updated_at < NOW() - INTERVAL '5 minutes'
              AND simulated_result IN ('successful'
                , 'failed')
            ORDER BY updated_at ASC FOR
            UPDATE SKIP LOCKED `);

        const recoveredPayments = [];

        for (const payment of result.rows) {
            const updateResult = await client.query(`
                UPDATE payments
                SET status     = $1,
                    updated_at = NOW()
                WHERE id = $2
                  AND user_id = $3
                  AND status = 'processing' RETURNING *
            `, [payment.simulated_result, payment.id, payment.user_id]);

            if (updateResult.rowCount === 0) continue;
            await client.query(`
                INSERT INTO payment_status_history (payment_id, old_status, new_status)
                VALUES ($1, 'processing', $2)
            `, [payment.id, payment.simulated_result]);
            recoveredPayments.push(updateResult.rows[0]);
        }
        await client.query('COMMIT');
        return recoveredPayments;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
module.exports = {
    getStaleProcessingPayments,
    recoverStaleProcessingPayments,
    createPayment,
    getAllPayments,
    getPaymentById,
    updatePayment,
    startPaymentProcessing,
    finishPaymentProcessing,
    simulatePaymentResult
};