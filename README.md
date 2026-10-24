# Utility Payment API

A RESTful backend API for managing utility bill payments, built with Node.js, Express.js, and PostgreSQL.

The project demonstrates backend engineering concepts including authentication, authorization, database transactions, payment lifecycle management, automated recovery, and automated testing.

## Features

- User registration and login.
- Password hashing with bcrypt.
- JWT-based authentication.
- Create, retrieve, and update utility payments.
- User-level authorization to protect payment records.
- Input validation for payment amounts, bill types, and payment IDs.
- PostgreSQL integration using parameterized queries.
- Transactional payment status updates.
- Payment status history for tracking state transitions.
- Simulated payment processing with successful and failed outcomes.
- Automatic recovery of eligible stale payments.
- Concurrent recovery protection using PostgreSQL row locking.
- API documentation with Swagger/OpenAPI.
- Unit and integration tests using Jest and Supertest.

## Payment Lifecycle

Payments follow this lifecycle:

```text
pending
   |
   v
processing
   |
   +------> successful
   |
   +------> failed
```

When payment processing starts, the API saves the simulated result and changes the payment status to `processing` in a database transaction.

Each status transition is recorded in `payment_status_history`. Transactions help keep payment updates and their corresponding history entries consistent.

### Automatic Payment Recovery

The server periodically checks for payments that have remained in `processing` for more than five minutes.

- The recovery job runs when the server starts and then every minute.
- Payments with a saved result of `successful` or `failed` can be recovered.
- The recovery process updates the payment status and records the transition in the history table.
- PostgreSQL row locking with `FOR UPDATE SKIP LOCKED` helps prevent concurrent recovery workers from processing the same row.
- Payments without a valid saved result are left unchanged because their final outcome is unknown.

This recovery mechanism demonstrates how a backend can handle interrupted payment processing without guessing the outcome of an uncertain payment.

## Tech Stack

- **Node.js** — JavaScript runtime.
- **Express.js** — REST API framework.
- **PostgreSQL** — Relational database.
- **node-postgres (`pg`)** — PostgreSQL client.
- **bcrypt** — Password hashing.
- **JSON Web Token (JWT)** — Authentication.
- **Jest** — Testing framework.
- **Supertest** — HTTP endpoint testing.
- **Swagger/OpenAPI** — API documentation.

## Getting Started

### Prerequisites

Install the following:

- Node.js
- npm
- PostgreSQL

### 1. Clone the Repository

```bash
git clone https://github.com/ahmed-sahlol/utility-payment-api.git
cd utility-payment-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=utility-payment-api
DB_USER=your_database_user
DB_PASSWORD=your_database_password

JWT_SECRET=your_long_random_secret

TEST_DB_NAME=utility_payment_test
```

Use your own database credentials and a strong, private JWT secret. Configure the required database tables and constraints before starting the API.

Integration tests require a separate test database named `utility_payment_test`, configured with the expected schema.

**Security:** Never commit `.env`, database credentials, or real secrets to GitHub.

### 4. Start the Server

```bash
npm start
```

The API runs at:

`http://localhost:3000`

Health check:

`GET /health`

Swagger API documentation:

`http://localhost:3000/api-docs`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/auth/register` | Register a new user | Not required |
| POST | `/auth/login` | Log in and receive a JWT | Not required |

### Payments

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/payments` | Create a payment | Required |
| GET | `/payments` | Retrieve the authenticated user's payments | Required |
| GET | `/payments/:id` | Retrieve a payment by ID | Required |
| PATCH | `/payments/:id` | Update a pending payment | Required |

For the complete request and response schemas, refer to the Swagger documentation at `/api-docs`.

## Authentication

After logging in, the API returns a JWT.

Include the token in the `Authorization` header when calling protected endpoints:

```http
Authorization: Bearer <your_jwt_token>
```

Replace `<your_jwt_token>` with the token returned by the login endpoint.

## Payments API Examples

### Create a Payment

**POST** `/payments`

Headers:

```http
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

Request body:

```json
{
  "billType": "electricity",
  "amount": 250
}
```

Example response — `201 Created`:

```json
{
  "paymentId": "generated-payment-uuid",
  "amount": 250,
  "billType": "electricity",
  "status": "pending"
}
```

The payment ID is generated by the server.

Supported bill types:

- `electricity`
- `water`
- `gas`

The amount must be a finite number greater than zero.

### Retrieve All Payments

**GET** `/payments`

Returns the authenticated user's payments, ordered by creation date with the newest first.

### Retrieve a Payment by ID

**GET** `/payments/:id`

Returns the requested payment if it exists and belongs to the authenticated user.

Possible responses:

- `200 OK` — Payment found.
- `400 Bad Request` — Invalid payment ID.
- `404 Not Found` — Payment not found or not owned by the authenticated user.
- `500 Internal Server Error` — Unexpected server or database error.

### Update a Payment

**PATCH** `/payments/:id`

Update the amount:

```json
{
  "amount": 300
}
```

Update the bill type:

```json
{
  "billType": "water"
}
```

Update both fields:

```json
{
  "amount": 300,
  "billType": "water"
}
```

Possible responses:

- `200 OK` — Payment updated.
- `400 Bad Request` — Invalid payment ID or input.
- `404 Not Found` — Payment not found or not owned by the authenticated user.
- `409 Conflict` — Payment cannot be updated because its status is not `pending`.
- `500 Internal Server Error` — Unexpected server or database error.

Only the authenticated user's payments can be updated, and only while their status is `pending`.

## Database Design

The API uses PostgreSQL tables to store user information, payments, and payment status history.

The `payments` table stores payment details, status, timestamps, and the simulated processing result.

The `payment_status_history` table records each status transition with the payment ID, previous status, new status, and change timestamp.

Database transactions are used when changing payment status and recording its history, helping prevent inconsistent state transitions.

## Validation Rules

### Creating Payments

- `billType` is required and must be a supported string.
- `amount` is required and must be a finite, positive number.
- Unsupported bill types are rejected.

### Updating Payments

- The payment ID must be a valid UUID.
- At least one of `amount` or `billType` must be provided.
- If provided, `amount` must be a finite, positive number.
- If provided, `billType` must be supported.
- Only payments with `pending` status can be updated.

## Running Tests

Run the test suite:

```bash
npm test
```

The project includes unit tests and PostgreSQL integration tests using Jest and Supertest.

The integration tests use a dedicated test database. The test setup checks `TEST_DB_NAME` to help prevent tests from running against an unintended database.

Keep test data separate from application data.

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
├── package.json
├── .gitignore
└── README.md
```

The project also contains Jest test files and Swagger/OpenAPI configuration.

## Future Improvements

- Add pagination and filtering for payment records.
- Introduce centralized error handling and consistent error responses.
- Add rate limiting and further security hardening.
- Add database migrations for schema changes.
- Improve graceful shutdown handling for background recovery tasks.
- Expand integration coverage for authentication and authorization edge cases.

## Author

**Ahmed Mostafa**

GitHub: [ahmed-sahlol](https://github.com/ahmed-sahlol)

Repository: [utility-payment-api](https://github.com/ahmed-sahlol/utility-payment-api)
