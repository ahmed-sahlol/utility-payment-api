# Utility Payment API

A RESTful backend API for user authentication and utility payment management, built with Node.js, Express, and
PostgreSQL.

## Features

- User registration and login
- JWT-based authentication
- Protected payment endpoints
- PostgreSQL persistence
- User-level payment access control
- Payment validation and status handling
- Unit and integration testing with Jest and Supertest
- Test database safety checks

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JSON Web Tokens (JWT)
- **Testing:** Jest and Supertest
- **Database Driver:** `pg`

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
DB_NAME=utility_payment
DB_USER=your_database_user
DB_PASSWORD=your_database_password

JWT_SECRET=your_long_random_secret

TEST_DB_NAME=utility_payment_test
```

Replace the example database credentials and JWT secret with your own values.

**Security:** Never commit `.env` or real credentials to GitHub. Use a separate PostgreSQL database for integration
tests.

### 4. Set up PostgreSQL

Create the application database and configure the required tables and constraints according to the project's database
schema.

The main entities are:

- **Users:** Stores user information and password hashes.
- **Payments:** Stores payment details, status, bill type, timestamps, and the associated user ID.

Passwords should be stored as hashes, not as plain text.

### 5. Start the server

```bash
npm start
```

The API runs on port `3000` by default, unless configured otherwise.

## API Endpoints

| Method | Endpoint         | Description                 | Authentication |
|--------|------------------|-----------------------------|----------------|
| GET    | `/health`        | Check API health            | No             |
| POST   | `/auth/register` | Register a new user         | No             |
| POST   | `/auth/login`    | Log in and obtain a JWT     | No             |
| POST   | `/payments`      | Create a payment            | Yes            |
| GET    | `/payments`      | Retrieve payments           | Yes            |
| GET    | `/payments/:id`  | Retrieve a specific payment | Yes            |
| PATCH  | `/payments/:id`  | Update an eligible payment  | Yes            |

Authenticated endpoints require a JWT in the request header:

```http
Authorization: Bearer <your_jwt_token>
```

Payment access is restricted by user ownership. Requests for another user's payment should not expose that payment's
data.

## Testing

Run the test suite:

```bash
npm test
```

The test suite uses Jest and Supertest to test API behavior. Integration tests use PostgreSQL and should run only
against the dedicated test database.

Before running integration tests, ensure that `TEST_DB_NAME` is set to:

```env
TEST_DB_NAME=utility_payment_test
```

The test suite includes authentication, payment operations, access-control checks, and database integration tests.

## Project Structure

```text
utility-payment-api/
├── controllers/
├── middleware/
├── routes/
├── services/
├── app.js
├── server.js
├── db.js
├── app.test.js
├── auth.test.js
├── authService.test.js
├── integration.test.js
├── test-db-integration.js
├── package.json
└── README.md
```

## Security Notes

- Keep secrets and database credentials in environment variables.
- Never commit `.env` to version control.
- Use JWT authentication for protected routes.
- Validate incoming request data.
- Restrict payment access to the owning user.
- Keep test data isolated from production data.

## License

No license has been specified yet.
