# ReadyOn — Time-Off Microservice

A full-stack leave management system. Employees request time off, managers approve or reject, and balances stay in sync with an external HCM system (e.g. Workday, SAP) in real time.

Built with **Node.js**, **Express.js**, **MongoDB**, and **React**.

---

## Project Structure

```
time-off-microservice/       ← Backend
├── src/
│   ├── config/database.js   # MongoDB connection
│   ├── models/              # Mongoose schemas (Balance, Request, SyncLog)
│   ├── services/            # Business logic (balance sync, request lifecycle)
│   ├── controllers/         # Route handlers
│   ├── routes/              # Express routes
│   ├── middleware/          # Auth, error handling, rate limiting
│   ├── jobs/syncJob.js      # Scheduled HCM sync (every 15 min)
│   └── app.js               # App entry point (port 3000)
├── mock-hcm/                ← Simulated HCM server (port 4000)
│   ├── data/store.js        # In-memory balance store
│   ├── routes/hcm.routes.js # Fake Workday API endpoints
│   └── server.js
├── tests/
│   ├── unit/                # Isolated function tests
│   ├── integration/         # API + DB + mock HCM tests
│   └── e2e/                 # Full user journey tests
├── .env.example
└── README.md

time-off-frontend/           ← React frontend (port 3001)
├── src/
│   ├── api/index.js         # All backend calls in one place
│   ├── context/             # AuthContext, ToastContext
│   ├── hooks/useFetch.js    # Reusable data-fetching hook
│   ├── components/          # Sidebar, Modal, StatusBadge
│   ├── pages/
│   │   ├── LoginPage.js
│   │   ├── employee/        # Dashboard, NewRequest, Balance
│   │   └── manager/         # Dashboard, AllRequests
│   └── App.js               # Routes + layout
└── package.json
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongodb://localhost:27017`)

---

### 1. Backend Setup

```bash
cd time-off-microservice

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI if different from default

# Run backend + mock HCM together
npm run dev:all
```

This starts:
- **Time-Off Microservice** → `http://localhost:3000`
- **Mock HCM Server** → `http://localhost:4000`

Or run them separately:
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run mock-hcm
```

---

### 2. Frontend Setup

```bash
cd time-off-frontend

# Install dependencies
npm install

# Start the React app
npm start
```

Frontend runs on → `http://localhost:3001`

> The frontend proxies all `/api` calls to `http://localhost:3000` automatically. Make sure the backend is running first.

---

### 3. Demo Login

No real authentication is needed. On the login screen, pick any demo user:

| Name | Role | Employee ID |
|------|------|-------------|
| Alex Johnson | Employee | emp_001 |
| Maria Garcia | Employee | emp_002 |
| Sam Patel | Employee | emp_003 |
| Chris Lee | Employee | emp_004 |
| Jordan Taylor | Manager | mgr_001 |

---

## Running Tests

```bash
cd time-off-microservice

# Run all tests
npm test

# Unit tests only (no DB or HTTP needed)
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# With coverage report
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

The Mock HCM starts with these balances out of the box:

| Employee | Location | Days |
|----------|----------|------|
| emp_001 | loc_NY | 15 |
| emp_001 | loc_LA | 10 |
| emp_002 | loc_NY | 20 |
| emp_003 | loc_NY | 5 |
| emp_004 | loc_NY | 0 |

---

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/timeoff_db
HCM_BASE_URL=http://localhost:4000
HCM_API_KEY=hcm-secret-key-12345
JWT_SECRET=super-secret-jwt-key-change-in-production
SYNC_CRON=*/15 * * * *
```