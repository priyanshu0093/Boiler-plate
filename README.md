# Boiler Plate — Multi-Tenant B2B SaaS Resource & Asset Booking Platform

Boiler Plate is a modern multi-tenant SaaS workspace resource booking platform built with React 19, Express.js, MongoDB/Mongoose, and Socket.IO. It enables organizations to manage physical and digital shared assets (meeting spaces, audio gear, displays, hardware test rigs) with strict data isolation, real-time synchronization, and policy quota enforcement.

> **Local Development Notice**: This project is configured strictly for local development and demonstration. No live hosting, production deployments, or remote database migrations should be performed.

---

## Architecture & Core Features

### 1. Multi-Tenant Architecture & Data Isolation
- **Organization Hierarchy**: Complete logical isolation of resources, bookings, invitations, and notifications by `organizationId`.
- **Tenant Context Resolution**: Client API requests automatically attach the active workspace header (`x-organization-id`), which the backend resolves and validates against authenticated user memberships.
- **Organization Switcher**: Dynamic navbar workspace dropdown allowing users who belong to multiple organizations to switch contexts instantly with clean cache invalidation.
- **Socket.IO Tenant Isolation**: WebSockets join authenticated tenant-specific rooms (`org:<orgId>`); cross-tenant event broadcast leakage is strictly blocked.

### 2. Centralized Free Plan Demo Quotas
Enforced on the backend with atomic concurrency mutex locks and clear machine-readable error codes:
- **Maximum 10 Active Resources**: Monitored and enforced per organization (`RESOURCE_LIMIT_EXCEEDED`).
- **Maximum 15 Active Members**: Monitored across team members and pending invites (`MEMBER_LIMIT_EXCEEDED`).
- **7-Day Advance Booking Window**: Reservations beyond 7 days into the future are rejected (`BOOKING_WINDOW_EXCEEDED`).
- **Zero Payment Gateway Dependencies**: Pure quota-based demo tier without fake or paid upgrade checkout flows.

### 3. Company Admin Dashboard
- **Capacity & Quota Monitoring**: Live progress indicators tracking active resource and member quota consumption.
- **Operational Metrics**: Total resources, available units, in-use units, maintenance assets, total reservations, and upcoming bookings.
- **Role-Based Controls**: Administrative actions (resource creation, role changes, member removal) restricted to workspace `OWNER` and `ADMIN` roles.
- **Suspension Notice**: Displays a workspace warning banner if the tenant has been suspended by a Platform Super Admin.

### 4. Platform Super Admin Console (`/platform-admin`)
- **System-Wide Visibility**: Platform KPIs including Total Tenants, Registered Platform Users, Global Resources, and Total Reservations.
- **Organization Management**: Searchable directory of all workspaces, creation dates, owners, and live resource/member usage.
- **Tenant Suspension & Reactivation**: Super admins can suspend organizations for compliance or policy violations. Suspended tenants immediately:
  - Block all write operations (`POST`, `PATCH`, `DELETE`) with `403 ORGANIZATION_SUSPENDED`.
  - Disconnect and eject connected sockets from real-time events.
  - Retain safe read-only (`GET`) access so existing user sessions receive the suspension banner.
- **Protected Authorization**: All platform APIs require server-side Super Admin role (`user.role === 'ADMIN'`). Company admins cannot access platform endpoints.

### 5. Onboarding & Invitation Flow
- **Self-Serve Registration**: Allows new users to create their own workspace and automatically receive the `OWNER` role.
- **Team Invitations**: Workspace admins can invite colleagues by email with `ADMIN` or `MEMBER` roles.
- **Development Preview Mode**: When SMTP credentials are omitted, the backend generates single-use preview URLs that can be copied directly from the modal for local testing.

---

## Tech Stack

- **Frontend**: React 19, Vite, Vanilla CSS design system, Lucide Icons, Socket.IO Client
- **Backend**: Node.js, Express.js, MongoDB / Mongoose, Socket.IO, JWT Authentication, bcryptjs
- **Linter & Tools**: Oxlint, Nodemon

---

## Local Setup & Installation

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017`

### 2. Environment Variables Configuration

Copy the example environment file in the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```

The default local development settings:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/deskdrop
JWT_SECRET=change_this_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Workspace Invitations Configuration
INVITATION_EXPIRES_DAYS=7

# Optional Email Provider Configuration (Omit for local Development Preview mode)
# SMTP_HOST=smtp.mailgun.org
# SMTP_PORT=587
# SMTP_USER=postmaster@your-domain.com
# SMTP_PASS=your_smtp_password
# SMTP_FROM=DeskDrop <invites@deskdrop.internal>
```
*(No environment file is required for the frontend; Vite defaults to proxying/requesting `http://localhost:5000` via `client.js`)*.

### 3. Install Dependencies

In the root directory or respective subdirectories:
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 4. Seed Demo Data & Bootstrap Super Admin

To seed the initial demo organization (`DeskDrop Headquarters`), 9 sample assets, and default users:
```bash
cd backend
npm run seed
```

#### Demo Credentials:
- **Platform Super Admin**:
  - Email: `admin@deskdrop.internal`
  - Password: `password123`
  - Access: System-wide Platform Super Admin console (`/platform-admin`) + Workspace Admin.
- **Demo Workspace Employees**:
  - `priya.sharma@deskdrop.internal` / `password123`
  - `alex.chen@deskdrop.internal` / `password123`
  - `marcus.vance@deskdrop.internal` / `password123`
  - `sarah.jenkins@deskdrop.internal` / `password123`

---

## Running the Application Locally

### 1. Start Backend Server
```bash
cd backend
npm run dev
```
Backend API will start at `http://localhost:5000`.

### 2. Start Frontend Client
```bash
cd frontend
npm run dev
```
Frontend development server will be available at `http://localhost:5173`.

---

## Safe Database Migration (Local / Test Database)

To safely migrate legacy single-tenant collections (tagging resources, bookings, and notifications with organization IDs):

1. **Dry-Run Mode (Safe simulation — no writes)**:
   ```bash
   cd backend
   npm run migrate:dry-run
   ```
2. **Execute Local Migration**:
   ```bash
   cd backend
   npm run migrate
   ```
*(Automated backups are created in `backend/backups/` before migration begins, which are excluded from git tracking)*.

---

## Running Automated Test Suites

The repository contains 5 comprehensive automated test suites covering all functionality:

Run all test suites at once:
```bash
cd backend
npm run test:all
```

Or run individual suites:
```bash
# 1. Core booking lifecycle, state machine, and conflict detection
node test_suite.js

# 2. Multi-tenant data isolation and authorization security
node test_multitenant.js

# 3. Frontend integration scenarios, organization switching, and socket isolation
node test_frontend_scenarios.js

# 4. Workspace self-registration and email invitation acceptance flows
node test_onboarding_invitations.js

# 5. Centralized Free plan quotas (10 resources, 15 members, 7 days) and Platform Super Admin
node test_plan_limits_and_platform.js
```

### Frontend Production Build & Linting
```bash
cd frontend
# Run linter
npm run lint

# Run production build validation
npm run build
```

---

## Project Structure

```
├── backend/
│   ├── config/             # DB connection, Free Plan limits configuration
│   ├── controllers/        # Auth, Organization, Invitation, Platform, Resource, Booking
│   ├── middleware/         # Auth, Tenant resolution, Error handling
│   ├── models/             # Organization, OrganizationMember, Invitation, Resource, Booking, User
│   ├── routes/             # REST API routes
│   ├── scripts/            # Safe multi-tenant database migration scripts
│   ├── seed/               # Demo data seeder script
│   ├── socket/             # Socket.IO tenant room isolation and event emitters
│   ├── test_suite.js       # Core booking lifecycle test suite
│   ├── test_multitenant.js # Tenant isolation test suite
│   ├── test_frontend_scenarios.js  # UI scenarios & WebSocket isolation test suite
│   ├── test_onboarding_invitations.js # Workspace creation & invite test suite
│   ├── test_plan_limits_and_platform.js # Free Plan quotas & Platform Admin test suite
│   └── server.js           # Express app & HTTP/WebSocket server entry point
├── frontend/
│   ├── src/
│   │   ├── api/            # API client attaching x-organization-id headers
│   │   ├── components/     # UI components (Navbar, OrganizationSwitcher, Modals, Badges)
│   │   ├── context/        # AuthContext, OrganizationContext, NotificationContext, SocketContext
│   │   ├── pages/          # Landing, Signup, Login, Dashboard, Admin, PlatformAdmin, Members
│   │   └── index.css       # Unified design system & responsive layout styles
│   └── package.json
└── README.md
```
