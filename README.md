# demo_hackathon_priyanshu

# DeskDrop — Internal Office Resource & Asset Booking System

DeskDrop is a modern, responsive internal office resource management platform designed for fast booking of shared desks, meeting rooms, hardware, and audiovisual gear with real-time status updates and conflict resolution.

---

## Features

- **Resource Catalog & Filtering**: Search and filter by category (Spaces, Audio, Displays, Testing Hardware, etc.) and availability status.
- **Real-Time Updates via Socket.IO**: Live resource state changes (`AVAILABLE`, `IN_USE`, `MAINTENANCE`) and booking events without requiring page refreshes.
- **Race-Condition Safe Booking**: Backend mutex locking prevents double-booking on overlapping slots.
- **Booking Lifecycle**:
  - `CONFIRMED` → `ACTIVE` (Check-in)
  - `ACTIVE` → `COMPLETED` (Check-out)
  - Cancellation & Auto-release for ghost bookings.
- **Employee Dashboard & Live Countdown**:
  - Highlights nearest upcoming confirmed booking with dynamic countdown timer.
  - Prioritizes active bookings with elapsed duration tracking.
- **In-App Notification Center**:
  - Real-time notification bell with live unread counter.
  - Dropdown panel for booking confirmations, check-ins, check-outs, cancellations, and auto-releases.
  - Persistent MongoDB storage with user isolation and "Mark all as read" capability.
- **User Profile Management**:
  - View and update personal profile details (Name, Phone, Department).
  - Secure immutable email and role fields.
- **Admin Management & Analytics**:
  - Resource CRUD and maintenance toggling.
  - Centralized booking control and utilization analytics.

---

## Tech Stack

- **Frontend**: React 19, Vite, Vanilla CSS design system, Lucide Icons, Socket.IO Client
- **Backend**: Node.js, Express, MongoDB Atlas / Mongoose, Socket.IO, JWT Authentication, bcryptjs
- **Architecture**: REST API with real-time WebSocket event bus

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Atlas or local instance)

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET
node server.js
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

App runs on `http://localhost:5173` with backend on `http://localhost:5000`.
