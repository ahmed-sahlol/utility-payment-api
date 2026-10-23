require('dotenv').config({quiet: true});

if (process.env.TEST_DB_NAME !== 'utility_payment_test') {
    throw new Error('Refusing to run integration tests on a non-test database');
}

process.env.DB_NAME = process.env.TEST_DB_NAME;


const request = require('supertest');
const crypto = require('crypto');
const app = require('./app');
const pool = require('./db');

describe('Payments API - PostgreSQL integration', () => {
    const email = `integration-a-${crypto.randomUUID()}@example.com`;
    const secondEmail = `integration-b-${crypto.randomUUID()}@example.com`;

    let userId;
    let token;
    let paymentId;

    afterAll(async () => {
        try {
            await pool.query(`DELETE
                              FROM payment_status_history
                              WHERE payment_id IN (SELECT id
                                                   FROM payments
                                                   WHERE user_id IN (SELECT id
                                                                     FROM users
                                                                     WHERE email IN ($1, $2)))`, [email, secondEmail]);

            await pool.query(`DELETE
                              FROM payments
                              WHERE user_id IN (SELECT id
                                                FROM users
                                                WHERE email IN ($1, $2))`, [email, secondEmail]);

            await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [email, secondEmail]);
        } finally {
            await pool.end();
        }
    });

    test('registers, logs in, and saves a payment in PostgreSQL', async () => {
        const registerResponse = await request(app)
            .post('/auth/register')
            .send({
                name: 'Integration Test User', email, password: 'TestPassword123!'
            });

        expect(registerResponse.status).toBe(201);
        expect(registerResponse.body.id).toBeDefined();

        userId = registerResponse.body.id;

        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                email, password: 'TestPassword123!'
            });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.token).toBeDefined();

        token = loginResponse.body.token;

        const paymentResponse = await request(app)
            .post('/payments')
            .set('Authorization', `Bearer ${token}`)
            .send({
                billType: 'electricity', amount: 150
            });

        expect(paymentResponse.status).toBe(201);

        paymentId = paymentResponse.body.paymentId;

        const savedPayment = await pool.query(`SELECT id, amount, bill_type, status, user_id
                                               FROM payments
                                               WHERE id = $1
                                                 AND user_id = $2`, [paymentId, userId]);

        expect(savedPayment.rows).toHaveLength(1);
        expect(Number(savedPayment.rows[0].amount)).toBe(150);
        expect(savedPayment.rows[0].bill_type).toBe('electricity');
        expect(savedPayment.rows[0].status).toBe('pending');
        expect(savedPayment.rows[0].user_id).toBe(userId);

        const secondRegisterResponse = await request(app)
            .post('/auth/register')
            .send({
                name: 'Second Integration User', email: secondEmail, password: 'TestPassword123!'
            });

        expect(secondRegisterResponse.status).toBe(201);

        const secondLoginResponse = await request(app)
            .post('/auth/login')
            .send({
                email: secondEmail, password: 'TestPassword123!'
            });

        expect(secondLoginResponse.status).toBe(200);

        const secondToken = secondLoginResponse.body.token;
        expect(secondToken).toBeDefined();

        const getResponse = await request(app)
            .get(`/payments/${paymentId}`)
            .set('Authorization', `Bearer ${secondToken}`);

        expect(getResponse.status).toBe(404);

        const patchResponse = await request(app)
            .patch(`/payments/${paymentId}`)
            .set('Authorization', `Bearer ${secondToken}`)
            .send({amount: 200});

        expect(patchResponse.status).toBe(404);

        const invalidTokenResponse = await request(app)
            .get(`/payments/${paymentId}`)
            .set('Authorization', 'Bearer invalid-token');

        expect(invalidTokenResponse.status).toBe(401);

        const missingPaymentId = crypto.randomUUID();

        const missingPaymentResponse = await request(app)
            .get(`/payments/${missingPaymentId}`)
            .set('Authorization', `Bearer ${secondToken}`);

        expect(missingPaymentResponse.status).toBe(404);
    });

    test('rolls back the final payment status if history insertion fails', async () => {
        expect(paymentId).toBeDefined();
        expect(token).toBeDefined();
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {
            });
        try {
            await pool.query(`
CREATE OR REPLACE FUNCTION fail_final_payment_history_insert()
RETURNS TRIGGER AS $$
BEGIN
IF NEW.new_status IN ('successful', 'failed') THEN
RAISE EXCEPTION 'Forced history insertion failure for rollback test';
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`);

            await pool.query(`
CREATE TRIGGER fail_final_payment_history_insert_trigger
BEFORE INSERT ON payment_status_history
FOR EACH ROW
EXECUTE FUNCTION fail_final_payment_history_insert();
`);

            const response = await request(app)
                .post(`/payments/${paymentId}/process`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(500);

            const paymentResult = await pool.query('SELECT status FROM payments WHERE id = $1 AND user_id = $2', [paymentId, userId]);

            expect(paymentResult.rows).toHaveLength(1);
            expect(paymentResult.rows[0].status).toBe('processing');

            const historyResult = await pool.query(`SELECT old_status, new_status
                                                    FROM payment_status_history
                                                    WHERE payment_id = $1
                                                    ORDER BY changed_at`, [paymentId]);

            expect(historyResult.rows.some(row => row.old_status === 'pending' && row.new_status === 'processing')).toBe(true);

            expect(historyResult.rows.some(row => row.old_status === 'processing' && ['successful', 'failed'].includes(row.new_status))).toBe(false);
        } finally {
            consoleErrorSpy.mockRestore();
            await pool.query(`
                DROP TRIGGER IF EXISTS fail_final_payment_history_insert_trigger
                ON payment_status_history;
            `);

            await pool.query(`
                DROP FUNCTION IF EXISTS fail_final_payment_history_insert();
            `);
        }
    });
});
