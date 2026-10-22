# Utility Payment API

A RESTful backend API for simulating utility bill payments, built with Node.js, Express, and PostgreSQL.

## Features

- Create utility payment records.
- Retrieve all payments.
- Retrieve a payment by ID.
- Update pending payments.
- Validate request data.
- Store payment records in PostgreSQL.
- Automated API tests using Jest and Supertest.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- `pg` — PostgreSQL client for Node.js
- Jest — testing
- Supertest — HTTP API testing
- dotenv — environment variable management

## Prerequisites

Before running the project, install:

- Node.js and npm
- PostgreSQL

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

Create a `.env` file in the project root directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

Replace the example values with your actual PostgreSQL database credentials.

**Security:** Never commit your `.env` file or expose your database password.

### 4. Set up the database

Create a PostgreSQL database, then create the `payments` table using the schema required by the application.

The table must include the fields used by the API, including `id`, `customer_name`, `amount`, `status`, `created_at`, and `bill_type`, with the required constraints.

### 5. Start the server

```bash
npm start
```

The API runs on port `3000` by default.

### 6. Run tests

```bash
npm test
```

## API Endpoints

Base URL: `http://localhost:3000`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |
| POST | `/payments` | Create a payment |
| GET | `/payments` | Retrieve all payments |
| GET | `/payments/:id` | Retrieve a payment by ID |
| PATCH | `/payments/:id` | Update a pending payment |

### Create a payment

**POST** `/payments`

Example request body:

```json
{
  "customerName": "Ahmed",
  "amount": 150,
  "billType": "electricity"
}
```

### Get all payments

**GET** `/payments`

### Get a payment by ID

**GET** `/payments/:id`

Replace `:id` with the payment's UUID.

### Update a payment

**PATCH** `/payments/:id`

Only pending payments can be updated. The request can include the fields supported by the API, such as `customerName`, `amount`, or `billType`.

## Testing

Run the automated test suite:

```bash
npm test
```

## Project Structure

```text
utility-payment-api/
├── controllers/
│   └── paymentController.js
├── routes/
│   └── paymentRoutes.js
├── services/
│   └── paymentService.js
├── app.js
├── server.js
├── db.js
├── app.test.js
├── test-db.js
├── package.json
├── package-lock.json
└── .gitignore
```

## License

ISC
