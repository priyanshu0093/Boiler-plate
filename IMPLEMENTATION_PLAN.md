# DeskDrop — Implementation Plan & Architectural Foundation

## A. Current Project Structure
- **Target Workspace**: `/Users/priyanshu/Developer/Vkapss/hackathon-01`
- **Current State**: Empty directory (newly initialized for this hackathon project).
- **Git Context**: Parent directory `/Users/priyanshu/Developer/Vkapss` contains the git root (`priyanshu0093/product_manager-`). No `.git` or project files exist inside `hackathon-01`.
- **System Environment**:
  - Node.js: `v24.6.0`
  - npm: `11.5.1`
  - MongoDB: `v8.0.13` (local daemon verified active and responsive on `mongodb://127.0.0.1:27017`)
  - No `package.json`, `.env`, or configuration files currently exist in `hackathon-01`.

```
hackathon-01/
└── (empty - clean slate for DeskDrop)
```

---

## B. Existing Functionality
- **Codebase**: None. No prior DeskDrop code exists.
- **Database**: Local MongoDB daemon is running and reachable.
- **Dependencies**: None installed in this workspace yet.
- **Socket.IO**: Not installed or configured.
- **Authentication**: None exists.
- **Routing / API**: None exists.

---

## C. Missing Architecture & Required Components

To achieve the project goals, the following architecture must be established:

### 1. Backend (`/backend`)
- **Runtime**: Node.js + Express.js
- **Database Layer**: Mongoose connected to MongoDB
- **Real-Time Engine**: Socket.IO integrated with HTTP server
- **Security / Auth**: JSON Web Tokens (JWT), `bcryptjs`, password hashing, auth middleware
- **Core Domain Logic**:
  - Strict conflict detection engine for booking overlapping time windows
  - Resource status state machine (`AVAILABLE`, `IN_USE`, `MAINTENANCE`)
  - Check-in, check-out, and auto-release lifecycle handlers
  - Background ghost booking expiration worker (grace period timer)
  - Endpoint for future n8n webhook triggers (`/api/automation/release-ghosts`)
- **Seeding**: Realistic office resources (Meeting Rooms, Audio Gear, Test Devices, Displays, Projectors) and test employee credentials.

### 2. Frontend (`/frontend`)
- **Tooling**: React (Vite)
- **Styling**: Vanilla CSS with an editorial design philosophy (neutral off-white `#FBFBF9`, crisp near-black `#121212`, muted forest green `#2E7D32` for Available, warm amber `#B45309` for In Use, subtle gray `#6B7280` for Maintenance, thin borders, generous whitespace, modern typography).
- **Real-time Client**: `socket.io-client` hook for instant zero-refresh state synchronization across tabs/users.
- **Responsive Layout**: Desktop, Tablet, and Mobile support.
- **Key Modules**:
  - Live Resource Catalog with status chips and category filters
  - Booking Modal with date/time pickers and conflict feedback
  - "My Bookings" management panel (Check-in, Check-out, Cancel)
  - Resource Utilization summary view

---

## D. Proposed Database Schemas

### 1. `User` Schema
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // bcrypt hashed
  avatar: { type: String, default: '' },
  role: { type: String, default: 'EMPLOYEE' } // Single user type: Employee
}, { timestamps: true });
```

### 2. `Resource` Schema
```javascript
const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['Spaces', 'Audio', 'Testing Hardware', 'Displays', 'Other'], 
    required: true,
    index: true 
  },
  description: { type: String, required: true },
  location: { type: String, required: true }, // e.g. "Floor 3, East Wing", "Lab Cabinet 2"
  image: { type: String, default: '' },
  specifications: { type: Map, of: String, default: {} }, // e.g. { capacity: "12", ports: "USB-C, HDMI" }
  status: { 
    type: String, 
    enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE'], 
    default: 'AVAILABLE',
    index: true 
  },
  currentBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

resourceSchema.index({ category: 1, status: 1 });
```

### 3. `Booking` Schema
```javascript
const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true, index: true },
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true, index: true },
  purpose: { type: String, required: true, trim: true },
  status: { 
    type: String, 
    enum: ['CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'AUTO_RELEASED'], 
    default: 'CONFIRMED',
    index: true 
  },
  checkInGracePeriodMinutes: { type: Number, default: 15 },
  checkedInAt: { type: Date, default: null },
  checkedOutAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  autoReleasedAt: { type: Date, default: null }
}, { timestamps: true });

// Compound index for conflict queries
bookingSchema.index({ resourceId: 1, status: 1, startTime: 1, endTime: 1 });
```

---

## E. Proposed API Structure

### Auth Endpoints (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new employee |
| `POST` | `/api/auth/login` | Login, issue JWT token & user profile |
| `GET` | `/api/auth/me` | Fetch authenticated employee profile |

### Resource Endpoints (`/api/resources`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/resources` | List resources (query by category, status, search) |
| `GET` | `/api/resources/:id` | Get resource details + upcoming confirmed bookings |
| `POST` | `/api/resources` | Add new office resource |
| `PATCH` | `/api/resources/:id/status` | Update status (e.g. toggle MAINTENANCE) |

### Booking Endpoints (`/api/bookings`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bookings` | List user bookings or resource bookings |
| `POST` | `/api/bookings` | Create booking (atomic conflict validation enforced) |
| `GET` | `/api/bookings/:id` | Get booking details |
| `POST` | `/api/bookings/:id/check-in` | Check in to booking (status -> ACTIVE, resource -> IN_USE) |
| `POST` | `/api/bookings/:id/check-out` | End/check out early (status -> COMPLETED, resource -> AVAILABLE) |
| `POST` | `/api/bookings/:id/cancel` | Cancel booking (status -> CANCELLED) |

### Automation & Analytics (`/api/automation` & `/api/analytics`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/automation/release-ghosts` | Sweeps expired bookings past grace period (usable by n8n or cron) |
| `GET` | `/api/analytics/utilization` | Aggregated booking hours, total bookings, resource breakdown |

---

## F. Booking Conflict Algorithm

Double booking must **never** occur. Validation occurs strictly on the backend before creating or updating any booking.

### Mathematical Condition
For a requested slot `[requestedStart, requestedEnd]` and any existing booking `B`:
A collision exists if and only if:
$$\text{existing.startTime} < \text{requestedEnd} \quad \text{AND} \quad \text{existing.endTime} > \text{requestedStart}$$

### Status Filter
Only active lifecycle statuses block new bookings:
$$\text{status} \in [\text{'CONFIRMED'}, \text{'ACTIVE'}]$$
Bookings that are `'COMPLETED'`, `'CANCELLED'`, or `'AUTO_RELEASED'` do **not** block reservations.

### Backend Implementation Pattern
```javascript
const requestedStart = new Date(req.body.startTime);
const requestedEnd = new Date(req.body.endTime);

if (requestedStart >= requestedEnd) {
  return res.status(400).json({ message: 'End time must be after start time' });
}

if (requestedStart < new Date(Date.now() - 5 * 60 * 1000)) {
  return res.status(400).json({ message: 'Cannot book in the past' });
}

// Check Resource Maintenance
const resource = await Resource.findById(resourceId);
if (!resource || !resource.isActive) {
  return res.status(404).json({ message: 'Resource not found or inactive' });
}
if (resource.status === 'MAINTENANCE') {
  return res.status(400).json({ message: 'Resource is currently under maintenance and cannot be booked' });
}

// Atomic Overlap Check
const conflictingBooking = await Booking.findOne({
  resourceId,
  status: { $in: ['CONFIRMED', 'ACTIVE'] },
  startTime: { $lt: requestedEnd },
  endTime: { $gt: requestedStart }
});

if (conflictingBooking) {
  return res.status(409).json({ 
    message: 'Time slot conflict: This resource is already booked for the requested period.',
    conflictingBooking: {
      startTime: conflictingBooking.startTime,
      endTime: conflictingBooking.endTime
    }
  });
}
```

---

## G. Resource Status Lifecycle

```
[AVAILABLE]
     │
     │ Employee creates booking
     ▼
[CONFIRMED (Booking)] ──(No check-in after grace period)──► [AUTO_RELEASED] ──► [AVAILABLE]
     │
     │ Employee checks in (within grace window)
     ▼
[IN_USE (Resource)] / [ACTIVE (Booking)]
     │
     │ Check-out or booking end
     ▼
[COMPLETED (Booking)] ──► [AVAILABLE (Resource)]

* Any time: Admin/Employee sets Resource to [MAINTENANCE] (booking blocked)
```

1. **Available**: Resource is idle.
2. **Reserved / Confirmed**: Booking exists for a future or current slot.
3. **In Use (Check-in)**: Employee hits Check-in. Booking becomes `ACTIVE`, Resource becomes `IN_USE`. Real-time event broadcast to all connected clients.
4. **Completed (Check-out)**: Employee hits Check-out. Booking becomes `COMPLETED`, Resource becomes `AVAILABLE`.
5. **Ghost Booking Auto-Release**: If current time $> \text{startTime} + 15\text{ mins}$ and booking is still `CONFIRMED` (no check-in), worker marks booking as `AUTO_RELEASED` and frees the resource immediately.
6. **Maintenance**: Can be flagged at any time; prevents any overlapping bookings.

---

## H. Socket.IO Event Architecture

A single Socket.IO server instance attached to Express HTTP server. All connected clients join a global channel or room to receive state updates.

### Broadcast Events
- `resource:status_changed`:
  ```json
  {
    "resourceId": "65...",
    "status": "IN_USE",
    "currentBookingId": "65...",
    "timestamp": "2026-10-07T12:00:00.000Z"
  }
  ```
- `booking:created`:
  ```json
  {
    "bookingId": "65...",
    "resourceId": "65...",
    "startTime": "2026-10-07T14:00:00.000Z",
    "endTime": "2026-10-07T15:00:00.000Z"
  }
  ```
- `booking:checked_in`:
  ```json
  {
    "bookingId": "65...",
    "resourceId": "65...",
    "checkedInAt": "2026-10-07T14:02:11.000Z"
  }
  ```
- `booking:checked_out`:
  ```json
  {
    "bookingId": "65...",
    "resourceId": "65...",
    "checkedOutAt": "2026-10-07T14:45:00.000Z"
  }
  ```
- `booking:cancelled`:
  ```json
  {
    "bookingId": "65...",
    "resourceId": "65..."
  }
  ```
- `booking:auto_released`:
  ```json
  {
    "bookingId": "65...",
    "resourceId": "65...",
    "reason": "Grace period expired without check-in"
  }
  ```

### Client Handler Workflow
1. Client connects on app mount (`const socket = io(SERVER_URL)`).
2. On any `resource:status_changed` or `booking:*` event, local React state is updated optimistically or refreshed seamlessly.
3. No manual browser reload required.

---

## I. Recommended Implementation Order

1. **Step 1: Workspace & Backend Setup**
   - Initialize `/backend` folder with `package.json` (`express`, `mongoose`, `cors`, `dotenv`, `socket.io`, `jsonwebtoken`, `bcryptjs`).
   - Create `.env` (`PORT=5001`, `MONGO_URI=mongodb://127.0.0.1:27017/deskdrop`, `JWT_SECRET=...`).
   - Create HTTP + Socket.IO server initialization (`server.js`, `socket.js`).
   - Create database connection (`config/db.js`).

2. **Step 2: Database Models & Seed Data**
   - Implement `User.js`, `Resource.js`, `Booking.js`.
   - Implement `seed.js` to populate:
     - Demo employee (`employee@deskdrop.internal / password123`)
     - Meeting rooms (Boardroom Alpha, Focus Pod 3)
     - Audio gear (Shure MV7, Rode Wireless Pro)
     - Testing devices (iPhone 15 Pro, Pixel 8 Pro)
     - Displays & Projectors (Dell UltraSharp 32", 4K Laser Projector)

3. **Step 3: Core API & Conflict Engine**
   - Auth routes & JWT middleware.
   - Resource listing and retrieval routes.
   - Booking creation route with strict overlap validation.
   - Check-in, check-out, and cancellation routes.
   - Ghost booking sweep cron / webhook route.

4. **Step 4: Real-time Socket.IO Integration**
   - Emit Socket.IO events on all status transitions in booking/resource controllers.

5. **Step 5: Frontend Scaffolding & Design System**
   - Initialize `/frontend` using Vite + React.
   - Install `socket.io-client`, `lucide-react` (or custom SVG icons).
   - Implement editorial Vanilla CSS design system (subtle borders, off-white canvas, stark typography, status indicators).

6. **Step 6: Frontend Pages & Features**
   - Auth pages (Login / Register).
   - Live Resource Catalog with real-time status chips and category filters.
   - Booking Modal with date/time pickers and conflict error display.
   - "My Bookings" page with Check-in / Check-out / Cancel buttons.
   - Utilization dashboard with key metrics.
   - Ensure responsive layout on Mobile, Tablet, and Desktop.

7. **Step 7: Verification & Testing**
   - Verify conflict validation with overlapping test cases.
   - Open two browser tabs to verify live Socket.IO status transitions without refresh.
   - Test ghost-booking auto-release.
