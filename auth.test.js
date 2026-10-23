const request = require('supertest');
const app = require('./app');
const authService = require('./services/authService');

jest.mock('./services/authService');

describe('Auth API Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // 1. Register successfully
    test('POST /auth/register - should register a new user', async () => {
        authService.createUser.mockResolvedValue({
            type: 'created', user: {
                id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com', created_at: '2026-10-22T10:00:00.000Z'
            }
        });

        const response = await request(app)
            .post('/auth/register')
            .send({
                name: 'Ahmed', email: 'Ahmed@Example.com', password: 'StrongPass123'
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id', 'user-123');
        expect(response.body).toHaveProperty('email', 'ahmed@example.com');

        // Sensitive information must not be returned
        expect(response.body).not.toHaveProperty('password');
        expect(response.body).not.toHaveProperty('password_hash');

        expect(authService.createUser).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Ahmed', email: 'ahmed@example.com', password: 'StrongPass123'
        }));
    });

    // 2. Reject invalid registration data
    test('POST /auth/register - should reject invalid data', async () => {
        const response = await request(app)
            .post('/auth/register')
            .send({
                name: '   ', email: 'ahmed@example.com', password: '123456'
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'Invalid data'
        });
        expect(authService.createUser).not.toHaveBeenCalled();
    });

    // 3. Reject duplicate email
    test('POST /auth/register - should reject an existing email', async () => {
        authService.createUser.mockResolvedValue({
            type: 'email_exists'
        });

        const response = await request(app)
            .post('/auth/register')
            .send({
                name: 'Ahmed', email: 'ahmed@example.com', password: 'StrongPass123'
            });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({
            message: 'Email already registered'
        });
    });

    // 4. Normalize registration input
    test('POST /auth/register - should trim name and normalize email', async () => {
        authService.createUser.mockResolvedValue({
            type: 'created', user: {
                id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com'
            }
        });

        await request(app)
            .post('/auth/register')
            .send({
                name: '  Ahmed  ', email: '  AHMED@EXAMPLE.COM  ', password: 'StrongPass123'
            });

        expect(authService.createUser).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Ahmed', email: 'ahmed@example.com'
        }));
    });

    // 5. Handle registration server errors
    test('POST /auth/register - should return 500 on server error', async () => {
        authService.createUser.mockRejectedValue(new Error('Database error'));

        const consoleSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {
            });

        try {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    name: 'Ahmed', email: 'ahmed@example.com', password: 'StrongPass123'
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                message: 'Internal server error'
            });
        } finally {
            consoleSpy.mockRestore();
        }
    });

    // 6. Login successfully
    test('POST /auth/login - should login and return a JWT', async () => {
        authService.loginUser.mockResolvedValue({
            type: 'authenticated', user: {
                id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com'
            }, token: 'test.jwt.token'
        });

        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'ahmed@example.com', password: 'StrongPass123'
            });

        expect(response.status).toBe(200);
        expect(response.body.user).toEqual({
            id: 'user-123', name: 'Ahmed', email: 'ahmed@example.com'
        });
        expect(response.body.token).toBe('test.jwt.token');

        expect(response.body.user).not.toHaveProperty('password');
        expect(response.body.user).not.toHaveProperty('password_hash');

        expect(authService.loginUser).toHaveBeenCalledWith({
            email: 'ahmed@example.com', password: 'StrongPass123'
        });
    });

    // 7. Reject invalid login data
    test('POST /auth/login - should reject invalid data', async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: '', password: 'StrongPass123'
            });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
            message: 'Invalid data'
        });
        expect(authService.loginUser).not.toHaveBeenCalled();
    });

    // 8. Reject incorrect credentials
    test('POST /auth/login - should reject incorrect credentials', async () => {
        authService.loginUser.mockResolvedValue({
            type: 'invalid_credentials'
        });

        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'ahmed@example.com', password: 'WrongPassword'
            });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: 'Invalid email or password'
        });
    });

    // 9. Normalize login email
    test('POST /auth/login - should normalize email', async () => {
        authService.loginUser.mockResolvedValue({
            type: 'invalid_credentials'
        });

        await request(app)
            .post('/auth/login')
            .send({
                email: '  AHMED@EXAMPLE.COM  ', password: 'WrongPassword'
            });

        expect(authService.loginUser).toHaveBeenCalledWith({
            email: 'ahmed@example.com', password: 'WrongPassword'
        });
    });

    // 10. Handle login server errors
    test('POST /auth/login - should return 500 on server error', async () => {
        authService.loginUser.mockRejectedValue(new Error('Database error'));

        const consoleSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => {
            });

        try {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'ahmed@example.com', password: 'StrongPass123'
                });

            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                message: 'Internal server error'
            });
        } finally {
            consoleSpy.mockRestore();
        }
    });
});