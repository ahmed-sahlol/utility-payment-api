jest.mock('./db', () => ({
    query: jest.fn()
}));

const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {createUser, loginUser} = require('./services/authService');

describe('Auth Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('createUser - should reject an existing email', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{id: 'existing-user'}]
        });

        const result = await createUser({
            id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com', password: 'StrongPass123'
        });

        expect(result).toEqual({type: 'email_exists'});
        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    test('createUser - should hash password before saving', async () => {
        pool.query
            .mockResolvedValueOnce({rows: []})
            .mockResolvedValueOnce({
                rows: [{
                    id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com', created_at: '2026-10-22T10:00:00.000Z'
                }]
            });

        const result = await createUser({
            id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com', password: 'StrongPass123'
        });

        expect(result.type).toBe('created');

        const insertParams = pool.query.mock.calls[1][1];
        const savedPassword = insertParams[3];

        expect(savedPassword).not.toBe('StrongPass123');
        expect(await bcrypt.compare('StrongPass123', savedPassword)).toBe(true);
        expect(result.user).not.toHaveProperty('password_hash');
    });

    test('loginUser - should authenticate and return a valid JWT', async () => {
        const passwordHash = await bcrypt.hash('StrongPass123', 4);

        pool.query.mockResolvedValueOnce({
            rows: [{
                id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com', password_hash: passwordHash
            }]
        });

        process.env.JWT_SECRET = 'test-secret-for-jest';

        const result = await loginUser({
            email: 'ahmed@example.com', password: 'StrongPass123'
        });

        expect(result.type).toBe('authenticated');
        expect(result.user).toEqual({
            id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com'
        });

        const decoded = jwt.verify(result.token, process.env.JWT_SECRET);

        expect(decoded.sub).toBe('user-123');
        expect(decoded.exp - decoded.iat).toBe(3600);
    });

    test('loginUser - should reject an unknown email', async () => {
        pool.query.mockResolvedValueOnce({rows: []});

        const result = await loginUser({
            email: 'unknown@example.com', password: 'StrongPass123'
        });

        expect(result).toEqual({type: 'invalid_credentials'});
    });

    test('loginUser - should reject an incorrect password', async () => {
        const passwordHash = await bcrypt.hash('CorrectPass123', 4);

        pool.query.mockResolvedValueOnce({
            rows: [{
                id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com', password_hash: passwordHash
            }]
        });

        const result = await loginUser({
            email: 'ahmed@example.com', password: 'WrongPass123'
        });

        expect(result).toEqual({type: 'invalid_credentials'});
    });
});
