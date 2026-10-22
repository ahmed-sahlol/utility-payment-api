# Utility Payment API

A RESTful API built with Node.js, Express, and PostgreSQL for user authentication and utility payment management.

The API supports user registration, login, JWT-based authentication, and secure payment operations.

## Features

- User registration and login
- Password hashing with bcrypt
- JWT-based authentication
- Protected payment endpoints
- Create and retrieve payments
- Retrieve payments by ID
- Update pending payments
- Restrict payment access to the authenticated owner
- PostgreSQL database integration
- Automated tests using Jest and Supertest

## Tech Stack

- **Node.js** — JavaScript runtime
- **Express.js** — Web framework
- **PostgreSQL** — Relational database
- **node-postgres (`pg`)** — PostgreSQL client
- **bcrypt** — Password hashing
- **jsonwebtoken** — JWT creation and verification
- **dotenv** — Environment variable management
- **Jest** — Testing framework
- **Supertest** — HTTP endpoint testing

## Prerequisites

Make sure you have installed:

- Node.js and npm
- PostgreSQL
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ahmed-sahlol/utility-payment-api.git
cd utility-payment-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

JWT_SECRET=replace_with_a_long_random_secret
```

Replace the database values with your PostgreSQL credentials. Set `JWT_SECRET` to a long, random, private value.

**Security:** Never commit your `.env` file or expose your database password or JWT secret. The `.env` file should remain excluded by `.gitignore`.

### 4. Set up PostgreSQL

Create a PostgreSQL database and configure the connection variables in `.env`.

The database must contain the `users` and `payments` tables described in the Database Schema section below.

The application expects the required tables and columns to exist. This repository currently does not include a `.sql` file for creating the schema.

### 5. Start the server

```bash
node server.js
```

By default, the server uses port `3000`, unless another port is configured through `PORT`.

When the server starts successfully, it prints a message similar to:

```text
Server running on port 3000
```

## API Endpoints

Base URL:

```text
http://localhost:3000
```

### Health Check

| Method | Endpoint | Authentication |
|---|---|---|
| GET | `/health` | Not required |

Checks whether the API is running.

Example response:

```json
{
  "status": "ok",
  "message": "Utility Payment API is running"
}
```

### Authentication

| Method | Endpoint | Authentication |
|---|---|---|
| POST | `/auth/register` | Not required |
| POST | `/auth/login` | Not required |

#### Register a user

`POST /auth/register`

Example request:

```json
{
  "name": "Ahmed",
  "email": "ahmed@example.com",
  "password": "your_password"
}
```

The password is hashed using bcrypt before being stored in the database.

#### Log in

`POST /auth/login`

Example request:

```json
{
  "email": "ahmed@example.com",
  "password": "your_password"
}
```

A successful login returns a JWT access token. Tokens expire after one hour.

Use the returned token to access protected endpoints.

### Payments

All payment endpoints require a valid JWT access token.

Include this HTTP header in your requests:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments` | Create a payment |
| GET | `/payments` | Retrieve the authenticated user's payments |
| GET | `/payments/:id` | Retrieve a payment by ID |
| PATCH | `/payments/:id` | Update a pending payment |

#### Create a payment

`POST /payments`

Example request:

```json
{
  "customerName": "Ahmed",
  "amount": 250,
  "billType": "electricity"
}
```

The payment is associated with the authenticated user.

#### Retrieve payments

`GET /payments`

Returns payments belonging to the authenticated user.

#### Retrieve a payment by ID

`GET /payments/:id`

Returns the requested payment only if it belongs to the authenticated user.

#### Update a payment

`PATCH /payments/:id`

Updates supported payment fields, such as `amount` and `billType`, according to the current controller validation.

Only payments with a `pending` status can be updated. A user cannot update another user's payment through these endpoints.

## Database Schema

The API uses PostgreSQL with two tables: `users` and `payments`.

The following columns and types reflect the current database schema.

### `users`

| Column | Type | Nullable |
|---|---|---|
| `id` | UUID | No |
| `name` | VARCHAR | No |
| `email` | VARCHAR | No |
| `password_hash` | TEXT | No |
| `created_at` | TIMESTAMPTZ | No |

### `payments`

| Column | Type | Nullable |
|---|---|---|
| `id` | UUID | No |
| `customer_name` | VARCHAR | No |
| `amount` | NUMERIC | No |
| `status` | TEXT | No |
| `created_at` | TIMESTAMPTZ | No |
| `bill_type` | VARCHAR | No |
| `user_id` | UUID | Yes |

### Database notes

- User passwords are stored as bcrypt hashes, not plain text.
- The API filters payment queries by the authenticated user's ID.
- The current database schema allows `payments.user_id` to be `NULL`.
- Consider adding a foreign key from `payments.user_id` to `users.id` and making `user_id` `NOT NULL` after checking existing data and constraints.
- Consider enforcing email uniqueness with a database constraint.

## Running Tests

Run the automated test suite:

```bash
npm test
```

The current test suite covers authentication, authentication services, payment operations, authorization, validation, and error handling.

The latest recorded test run passed **38 tests across 3 test suites**.

## Project Structure

```text
utility-payment-api/
├── controllers/
│   ├── authController.js
│   └── paymentController.js
├── middleware/
│   └── authMiddleware.js
├── routes/
│   ├── authRoutes.js
│   └── paymentRoutes.js
├── services/
│   ├── authService.js
│   └── paymentService.js
├── app.js
├── server.js
├── db.js
├── app.test.js
├── auth.test.js
├── authService.test.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## Security Considerations

- Keep secrets in environment variables.
- Never commit `.env` or other files containing credentials.
- Use HTTPS when deploying the API.
- Use a strong, randomly generated JWT secret.
- Keep dependencies updated.
- Enforce database constraints for data integrity.
- Consider rate limiting authentication endpoints in production.

## Future Improvements

- Add database migrations and a schema setup script.
- Add integration tests against a real PostgreSQL database.
- Improve database constraints and indexes.
- Add pagination for payment listings.
- Introduce centralized error handling and structured logging.
- Add API documentation using OpenAPI/Swagger.
- Add rate limiting and production deployment configuration.

## License

This project is licensed under the ISC License.
