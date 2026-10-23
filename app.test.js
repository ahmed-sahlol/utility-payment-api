const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

jest.mock('./db', () => ({
    query: jest.fn(),
}));

const app = require('./app');
const pool = require('./db');

const userId = '00000000-0000-4000-8000-000000000010';
const otherUserId = '00000000-0000-4000-8000-000000000020';
const paymentId = '00000000-0000-4000-8000-000000000001';

const token = jwt.sign({sub: userId}, process.env.JWT_SECRET, {expiresIn: '1h'},);

const otherToken = jwt.sign({sub: otherUserId}, process.env.JWT_SECRET, {expiresIn: '1h'},);

// Attach a valid JWT to a Supertest request.
const auth = (req, value = token) => req.set('Authorization', `Bearer ${value}`);

beforeEach(() => {
    pool.query.mockReset();
});

describe('GET /health', () => {
    test('should return status 200 and correct response', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            message: 'Utility Payment API is running', status: 'ok',
        });
    });
});

describe('Authentication middleware', () => {
    test('should reject requests without a token', async () => {
        const response = await request(app).get('/payments');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Access token required');
        expect(pool.query).not.toHaveBeenCalled();
    });

    test('should reject an invalid token', async () => {
        const response = await request(app)
            .get('/payments')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid or expired token');
        expect(pool.query).not.toHaveBeenCalled();
    });
});

describe('POST /payments', () => {
    test('should return 400 when required fields are missing', async () => {
        const response = await auth(request(app).post('/payments'),).send({});

        expect(response.status).toBe(400);
    });

    test('should return 400 when amount is invalid', async () => {
        const response = await auth(request(app).post('/payments'),).send({
            billType: 'electricity', amount: -100,
        });

        expect(response.status).toBe(400);
    });

    test('should return 400 when billType is invalid', async () => {
        const response = await auth(request(app).post('/payments'),).send({
            billType: 'pizza', amount: 100,
        });

        expect(response.status).toBe(400);
    });

    test('should create a payment and associate it with the logged-in user', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                id: paymentId, amount: '150.00', bill_type: 'electricity', user_id: userId, status: 'pending',
            }],
        });

        const response = await auth(request(app).post('/payments'),).send({
            billType: 'electricity', amount: 150,
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            billType: 'electricity', amount: 150, status: 'pending',
        });

        expect(response.body.paymentId).toBeDefined();

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO payments'), expect.arrayContaining([expect.any(String), 150, 'electricity', userId,]),);
    });

    test('should return 500 when database fails', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database connection failed'),);

        const response = await auth(request(app).post('/payments'),).send({
            billType: 'electricity', amount: 150,
        });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({message: 'db error'});
    });
});

describe('GET /payments', () => {
    test('should return only the logged-in user payments', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                id: paymentId, amount: '150.00', bill_type: 'electricity', status: 'pending', user_id: userId,
            }],
        });

        const response = await auth(request(app).get('/payments'),);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = $1'), [userId],);
    });

    test('should return an empty array when the user has no payments', async () => {
        pool.query.mockResolvedValueOnce({rows: []});

        const response = await auth(request(app).get('/payments'),);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });

    test('should return 500 when database fails', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database connection failed'),);

        const response = await auth(request(app).get('/payments'),);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({message: 'db error'});
    });
});

describe('GET /payments/:id', () => {
    test('should return 400 when payment ID is invalid', async () => {
        const response = await auth(request(app).get('/payments/not-a-valid-uuid'),);

        expect(response.status).toBe(400);
    });

    test('should return 404 when payment does not belong to the user', async () => {
        pool.query.mockResolvedValueOnce({rows: []});

        const response = await auth(request(app).get(`/payments/${paymentId}`),);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Payment not found');

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('user_id =$2'), [paymentId, userId],);
    });

    test('should return a payment belonging to the user', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                id: paymentId, amount: '150.00', bill_type: 'electricity', status: 'pending', user_id: userId,
            }],
        });

        const response = await auth(request(app).get(`/payments/${paymentId}`),);

        expect(response.status).toBe(200);
        expect(response.body.user_id).toBe(userId);
    });

    test('should return 500 when database fails', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database connection failed'),);

        const response = await auth(request(app).get(`/payments/${paymentId}`),);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({message: 'db error'});
    });

    test('should not allow a user to read another user payment', async () => {
        pool.query.mockResolvedValueOnce({rows: []});

        const response = await auth(request(app).get(`/payments/${paymentId}`), otherToken,);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Payment not found');

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('user_id =$2'), [paymentId, otherUserId],);
    });
});

describe('PATCH /payments/:id', () => {
    test('should return 400 when payment ID is invalid', async () => {
        const response = await auth(request(app).patch('/payments/not-a-valid-uuid'),).send({amount: 200});

        expect(response.status).toBe(400);
    });

    test('should return 400 when no fields are provided', async () => {
        const response = await auth(request(app).patch(`/payments/${paymentId}`),).send({});

        expect(response.status).toBe(400);
    });

    test('should return 400 when amount is invalid', async () => {
        const response = await auth(request(app).patch(`/payments/${paymentId}`),).send({amount: -200});

        expect(response.status).toBe(400);
    });

    test('should update a pending payment belonging to the user', async () => {
        const updatedPayment = {
            id: paymentId, amount: '200.00', bill_type: 'electricity', status: 'pending', user_id: userId,
        };

        pool.query.mockResolvedValueOnce({
            rows: [updatedPayment],
        });

        const response = await auth(request(app).patch(`/payments/${paymentId}`),).send({amount: 200});

        expect(response.status).toBe(200);
        expect(response.body.amount).toBe('200.00');

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('user_id = $4'), [200, null, paymentId, userId],);
    });

    test('should return 404 when payment belongs to another user', async () => {
        pool.query
            .mockResolvedValueOnce({rows: []})
            .mockResolvedValueOnce({rows: []});

        const response = await auth(request(app).patch(`/payments/${paymentId}`), otherToken,).send({amount: 900});

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Payment not found');

        expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('user_id =$2'), [paymentId, otherUserId],);
    });

    test('should return 409 when the user payment is not pending', async () => {
        pool.query
            .mockResolvedValueOnce({rows: []})
            .mockResolvedValueOnce({
                rows: [{id: paymentId, status: 'successful'}],
            });

        const response = await auth(request(app).patch(`/payments/${paymentId}`),).send({amount: 200});

        expect(response.status).toBe(409);
        expect(response.body.message).toBe('Cannot update a payment that is not pending',);
    });

    test('should return 500 when database fails', async () => {
        pool.query.mockRejectedValueOnce(new Error('Database connection failed'),);

        const response = await auth(request(app).patch(`/payments/${paymentId}`),).send({amount: 200});

        expect(response.status).toBe(500);
        expect(response.body).toEqual({message: 'db error'});
    });
});