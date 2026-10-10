# Boiler Plate Frontend — React 19 + Vite

The client application for Boiler Plate SaaS, an internal office resource and asset booking platform.

## Features
- **Organization Switcher**: Dynamic tenant switcher in navigation bar.
- **Real-Time Updates**: Socket.IO integration for live booking notifications and resource status transitions.
- **Company Operations Dashboard**: Capacity indicators tracking 10-resource and 15-member quotas.
- **Platform Super Admin Console**: Distinct `/platform-admin` management interface for platform administrators.
- **Workspace Onboarding & Email Invites**: Self-serve registration, invitation preview links, and instant acceptance.

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Runs at `http://localhost:5173`. Connects to the backend at `http://localhost:5000`.

### 3. Run Linter
```bash
npm run lint
```

### 4. Build for Production
```bash
npm run build
```
Generates production assets in `dist/`.
