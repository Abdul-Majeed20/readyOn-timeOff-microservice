# ReadyOn — Time-Off Microservice

A full-stack leave management system. Employees request time off, managers approve or reject, and balances stay in sync with an external HCM system (e.g. Workday, SAP) in real time.

Built with **Node.js**, **Express.js**, **MongoDB**, and **React**.

---

## Project Structure

```
time-off-microservice/                    ← Backend
├── src/
│   ├── config/
│   │   └── database.js                  
│   │
│   ├── models/
│   │   ├── Balance.js                   
│   │   ├── TimeOffRequest.js            
│   │   ├── SyncLog.js                   
│   │   ├── Company.js                   — stores company + join code
│   │   └── User.js                      — real users with hashed passwords
│   │
│   ├── services/
│   │   ├── hcmClient.js                 
│   │   ├── balanceService.js            
│   │   ├── requestService.js           
│   │   └── authService.js              — register, login, token logic
│   │
│   ├── controllers/
│   │   ├── requestController.js         
│   │   ├── balanceController.js         
│   │   └── authController.js           — signup/login/me endpoints
│   │
│   ├── routes/
│   │   ├── timeOffRoutes.js            
│   │   ├── balanceRoutes.js            
│   │   └── authRoutes.js              
│   │
│   ├── middleware/
│   │   ├── errorHandler.js              
│   │   ├── rateLimiter.js               
│   │   └── auth.js                      — now verifies real JWT
│   │
│   ├── jobs/syncJob.js                 
│   └── app.js                          — registers auth routes
│
├── hcm/                            
├── tests/                               
├── .env.example                        — adds JWT_SECRET, BCRYPT_ROUNDS
└── README.md

time-off-frontend/                       ← Frontend
├── src/
│   ├── api/
│   │   └── index.js                    — Bearer token on all calls
│   │
│   ├── context/
│   │   ├── AuthContext.js              — real login/logout/register
│   │   └── ToastContext.js              
│   │
│   ├── hooks/
│   │   └── useFetch.js                  
│   │
│   ├── utils/
│   │   └── index.js                     
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.js              — shows real user name/company
│   │   └── ui/
│   │       ├── StatusBadge.js           
│   │       └── Modal.js                 
│   │
│   ├── pages/
│   │   ├── LoginPage.js                — real email/password form
│   │   ├── RegisterPage.js             — employee registration with company code
│   │   ├── CompanySignupPage.js        — company admin registration
│   │   │
│   │   ├── employee/
│   │   │   ├── EmployeeDashboard.js    — uses real user data
│   │   │   ├── NewRequestPage.js        
│   │   │   └── BalancePage.js           
│   │   │
│   │   └── manager/
│   │       ├── ManagerDashboard.js     — fetches company employees
│   │       ├── AllRequestsPage.js      — fetches company employees
│   │       └── TeamPage.js             — manage employees, assign roles
│   │
│   ├── App.js                          — adds new routes
│   ├── index.js                         
│   └── index.css                       — new page styles
│
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

### 3. Project flow

Company Admin signs up
        ↓
Gets a unique Company Code (e.g. WIZDA-4X9K)
        ↓
Shares code with employees
        ↓
Employees register using that code
        ↓
Admin assigns manager role to specific employees
        ↓
Everyone logs in with email + password
        ↓
JWT token issued → stored in localStorage
        ↓
All API calls use Bearer token in header

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
