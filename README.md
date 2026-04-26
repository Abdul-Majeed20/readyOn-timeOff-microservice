# Time-Off Microservice

A backend microservice for managing employee time-off requests and keeping leave balances in sync with an HCM system (e.g. Workday, SAP).

Built with **Node.js**, **Express.js**, and **MongoDB**.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` with your MongoDB URI and other settings.

### 3. Run both servers together (recommended)
```bash
npm run dev:all
```

This starts:
- **Time-Off Microservice** on `http://localhost:3000`
- **Mock HCM Server** on `http://localhost:4000`

Or run them separately:
```bash
# Terminal 1 — Main microservice
npm run dev

# Terminal 2 — Mock HCM
npm run mock-hcm
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests (no DB or HTTP needed)
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only E2E tests
npm run test:e2e

# Run with coverage report
npm run test:coverage
```

---

## API Reference

### Authentication
All endpoints require these headers:
```
x-employee-id: emp_001
x-role: employee | manager
```

The batch sync endpoint uses an HCM API key instead:
```
x-hcm-api-key: your-hcm-key
```

---

### Time-Off Endpoints

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/time-off/request` | Employee | Submit a new time-off request |
| GET | `/api/time-off/:employeeId` | Employee/Manager | List requests |
| PATCH | `/api/time-off/:id/approve` | Manager | Approve a request |
| PATCH | `/api/time-off/:id/reject` | Manager | Reject a request |
| PATCH | `/api/time-off/:id/cancel` | Employee | Cancel own request |

#### Submit Request Body
```json
{
  "locationId": "loc_NY",
  "days": 3,
  "startDate": "2025-02-01",
  "endDate": "2025-02-03",
  "reason": "Family vacation"
}
```

For idempotency, add header: `Idempotency-Key: your-unique-key`

---

### Balance Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/balances/:employeeId/:locationId` | Get live balance (synced from HCM) |
| POST | `/api/balances/sync` | Manually trigger sync |
| POST | `/api/balances/batch` | HCM pushes bulk update (requires HCM API key) |
| GET | `/api/balances/:employeeId/:locationId/logs` | View sync history |

---

### Mock HCM Endpoints (port 4000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/hcm/balance/:employeeId/:locationId` | Get balance |
| POST | `/hcm/deduct` | Deduct days |
| POST | `/hcm/restore` | Restore days |
| GET | `/hcm/balances` | Get all balances |
| POST | `/hcm/admin/seed` | Seed test data |
| POST | `/hcm/admin/reset` | Reset to defaults |
| POST | `/hcm/admin/anniversary` | Simulate anniversary bonus |
| POST | `/hcm/admin/year-reset` | Simulate year-end reset |

---

## Seeded Test Data

The Mock HCM starts with these balances:

| Employee | Location | Days |
|----------|----------|------|
| emp_001 | loc_NY | 15 |
| emp_001 | loc_LA | 10 |
| emp_002 | loc_NY | 20 |
| emp_003 | loc_NY | 5 |
| emp_004 | loc_NY | 0 |

---

## Project Structure

```
time-off-microservice/
├── src/
│   ├── config/database.js        # MongoDB connection
│   ├── models/                   # Mongoose schemas
│   ├── services/                 # Business logic
│   ├── controllers/              # Route handlers
│   ├── routes/                   # Express routes
│   ├── middleware/               # Auth, errors, rate limiting
│   ├── jobs/syncJob.js           # Scheduled HCM sync
│   └── app.js                    # App entry point
├── mock-hcm/                     # Simulated HCM server
├── tests/
│   ├── unit/                     # Function-level tests
│   ├── integration/              # API + DB tests
│   └── e2e/                      # Full journey tests
├── .env.example
└── README.md
```