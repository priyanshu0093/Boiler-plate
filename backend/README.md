# DeskDrop Backend — Node.js & Express Multi-Tenant API

Backend API and WebSocket server for the DeskDrop SaaS resource booking platform.

## Features
- **Multi-Tenant Data Isolation**: All resources, bookings, invitations, and notifications are scoped to `organizationId`.
- **Tenant Context**: Automatically resolves `x-organization-id` header against authenticated user memberships.
- **Centralized Free Plan Quotas**:
  - Max 10 active resources (`RESOURCE_LIMIT_EXCEEDED`)
  - Max 15 active members (`MEMBER_LIMIT_EXCEEDED`)
  - Max 7-day advance booking window (`BOOKING_WINDOW_EXCEEDED`)
  - Concurrency safety with mutex locks per organization
- **Platform Super Admin APIs**: `/api/platform/*` endpoints protected with `requirePlatformAdmin` (`user.role === 'ADMIN'`).
- **Organization Suspension**: Suspended organizations block all mutations (`403 ORGANIZATION_SUSPENDED`) and real-time socket room joins.
- **WebSocket Rooms**: Socket.IO connections isolated into `org:<orgId>` rooms.

## Local Development

### 1. Configure Environment
```bash
cp .env.example .env
```
Default connection string: `mongodb://127.0.0.1:27017/deskdrop`.

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Demo Data
```bash
npm run seed
```
Creates default organization `DeskDrop Headquarters`, 9 office resources, and 5 demo users:
- Super Admin: `admin@deskdrop.internal` / `password123`
- Employees: `alex.chen@deskdrop.internal`, `priya.sharma@deskdrop.internal`, etc.

### 4. Start Server
```bash
npm run dev
```
Starts server on `http://localhost:5000` with hot-reloading via nodemon.

### 5. Run Automated Tests
```bash
# Run all test suites
npm run test:all

# Run individual test suites
node test_suite.js
node test_multitenant.js
node test_frontend_scenarios.js
node test_onboarding_invitations.js
node test_plan_limits_and_platform.js
```

### 6. Safe Multi-Tenant Database Migration
```bash
# Dry run simulation (no database writes)
npm run migrate:dry-run

# Run migration
npm run migrate
```
*(Automated JSON backup is created in `backups/` before migration starts)*.
