const request = require('supertest');

jest.mock('./db', () => ({
    query: jest.fn(),
}));

const app = require('./app');
const pool = require('./db');

beforeEach(() => {
    pool.query.mockReset();
});

describe('GET /health', () => {
    test('should return status 200 and correct response', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            message: 'Utility Payment API is running',
            status: 'ok',
        });
    });
});

describe('POST /payments', () => {
    test('should return 400 when required fields are missing', async () => {
        const response = await request(app)
            .post('/payments')
            .send({});

        expect(response.status).toBe(400);
    });

    test('should return 400 when amount is invalid', async () => {
        const response = await request(app)
            .post('/payments')
            .send({
                customerName: 'Ahmed',
                billType: 'electricity',
                amount: -100,
            });

        expect(response.status).toBe(400);
    });

    test('should return 400 when billType is invalid', async () => {
        const response = await request(app)
            .post('/payments')
            .send({
                customerName: 'Ahmed',
                billType: 'pizza',
                amount: 100,
            });

        expect(response.status).toBe(400);
    });

    test('should create a payment successfully', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
            .post('/payments')
            .send({
                customerName: 'Ahmed',
                billType: 'electricity',
                amount: 150,
            });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            customerName: 'Ahmed',
            billType: 'electricity',
            amount: 150,
        });
        expect(response.body.paymentId).toBeDefined();
    });

    test('should return 500 when database fails', async () => {
        pool.query.mockRejectedValueOnce(
            new Error('Database connection failed')
        );

        const response = await request(app)
            .post('/payments')
            .send({
                customerName: 'Ahmed',
                billType: 'electricity',
                amount: 150,
            });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'db error' });
    });
});

describe('PATCH /payments/:id', () => {
    const paymentId = '00000000-0000-4000-8000-000000000001';

    test('should return 400 when payment ID is invalid', async () => {
        const response = await request(app)
            .patch('/payments/not-a-valid-uuid')
            .send({ amount: 200 });

        expect(response.status).toBe(400);
    });

    test('should return 404 when payment does not exist', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [] }) // UPDATE
            .mockResolvedValueOnce({ rows: [] }); // SELECT

        const response = await request(app)
            .patch(`/payments/${paymentId}`)
            .send({ amount: 200 });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Payment not found');
    });

    test('should update a pending payment successfully', async () => {
        const updatedPayment = {
            id: paymentId,
            customer_name: 'Ahmed',
            amount: '200.00',
            bill_type: 'electricity',
            status: 'pending',
        };

        pool.query.mockResolvedValueOnce({
            rows: [updatedPayment],
        });

        const response = await request(app)
            .patch(`/payments/${paymentId}`)
            .send({ amount: 200 });

        expect(response.status).toBe(200);
        expect(response.body.amount).toBe('200.00');
        expect(response.body.status).toBe('pending');
    });

    test('should return 409 when payment is successful', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{ id: paymentId, status: 'successful' }],
            });

        const response = await request(app)
            .patch(`/payments/${paymentId}`)
            .send({ amount: 200 });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe(
            'Cannot update a payment that is not pending'
        );
    });

    test('should return 409 when payment has failed', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{ id: paymentId, status: 'failed' }],
            });

        const response = await request(app)
            .patch(`/payments/${paymentId}`)
            .send({ amount: 200 });

        expect(response.status).toBe(409);
    });

    test('should return 500 when database fails', async () => {
        pool.query.mockRejectedValueOnce(
            new Error('Database connection failed')
        );

        const response = await request(app)
            .patch(`/payments/${paymentId}`)
            .send({ amount: 200 });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'db error' });
    });
});

describe('GET /payments', () => {
    test('should return 200 and an array of payments', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app).get('/payments');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return 500 when database fails', async () => {
        pool.query.mockRejectedValueOnce(
            new Error('Database connection failed')
        );

        const response = await request(app).get('/payments');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'db error' });
    });
});

describe('GET /payments/:id', () => {
    const paymentId = '00000000-0000-4000-8000-000000000001';

    test('should return 404 when payment does not exist', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
            .get(`/payments/${paymentId}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Payment not found');
    });

    test('should return 500 when database fails', async () => {
        pool.query.mockRejectedValueOnce(
            new Error('Database connection failed')
        );

        const response = await request(app)
            .get(`/payments/${paymentId}`);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'db error' });
    });
});
