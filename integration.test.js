require('dotenv').config();

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

    afterAll(async () => {
        try {
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
                name: 'Integration Test User', email, password: 'TestPassword123!',
            });

        expect(registerResponse.status).toBe(201);
        expect(registerResponse.body.id).toBeDefined();

        userId = registerResponse.body.id;

        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                email, password: 'TestPassword123!',
            });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body.token).toBeDefined();

        const token = loginResponse.body.token;

        const paymentResponse = await request(app)
            .post('/payments')
            .set('Authorization', `Bearer ${token}`)
            .send({
                billType: 'electricity', amount: 150,
            });

        expect(paymentResponse.status).toBe(201);

        const savedPayment = await pool.query(`SELECT id, amount, bill_type, status, user_id
                                               FROM payments
                                               WHERE id = $1
                                                 AND user_id = $2`, [paymentResponse.body.paymentId, userId],);

        expect(savedPayment.rows).toHaveLength(1);
        expect(Number(savedPayment.rows[0].amount)).toBe(150);
        expect(savedPayment.rows[0].bill_type).toBe('electricity');
        expect(savedPayment.rows[0].status).toBe('pending');
        expect(savedPayment.rows[0].user_id).toBe(userId);
        const secondRegisterResponse = await request(app)
            .post('/auth/register')
            .send({
                name: 'Second Integration User', email: secondEmail, password: 'TestPassword123!',
            });

        expect(secondRegisterResponse.status).toBe(201);

        const secondLoginResponse = await request(app)
            .post('/auth/login')
            .send({
                email: secondEmail, password: 'TestPassword123!',
            });

        expect(secondLoginResponse.status).toBe(200);

        const secondToken = secondLoginResponse.body.token;
        expect(secondToken).toBeDefined();

        const getResponse = await request(app)
            .get(`/payments/${paymentResponse.body.paymentId}`)
            .set('Authorization', `Bearer ${secondToken}`);

        expect(getResponse.status).toBe(404);

        const patchResponse = await request(app)
            .patch(`/payments/${paymentResponse.body.paymentId}`)
            .set('Authorization', `Bearer ${secondToken}`)
            .send({amount: 200});


        expect(patchResponse.status).toBe(404);

        const invalidTokenResponse = await request(app)
            .get(`/payments/${paymentResponse.body.paymentId}`)
            .set('Authorization', 'Bearer invalid-token');

        expect(invalidTokenResponse.status).toBe(401);

        const missingPaymentId = crypto.randomUUID();

        const missingPaymentResponse = await request(app)
            .get(`/payments/${missingPaymentId}`)
            .set('Authorization', `Bearer ${secondToken}`);

    });
});
