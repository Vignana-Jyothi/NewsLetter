# NEWSFLOW — Project Progress Tracker

> Last Updated: 20 June 2026
> Stack: React · Node.js · Express · PostgreSQL · PDFKit · Multer

---

## 📊 Overall Progress

```
Module 1 — Foundation & Mock Auth     ████████████ 100%  ✅
Module 2 — Submissions                ████████████ 100%  ✅
Module 3 — Approvals & Notifications  ████████████ 100%  ✅
Module 4 — Newsletter Generation      ████████████ 100%  ✅
Module 5 — Publication                ████████████ 100%  ✅
Module 6 — Archival & Search          ████████████ 100%  ✅
──────────────────────────────────────
DB Running & Seeded                   ████████████ 100%  ✅
```

---

## ✅ Completed

### Module 1 — Foundation & Mock Auth

- [x] Backend initialized (`Node.js` + `Express`)
- [x] Frontend initialized (`React` + `Vite` + `Tailwind CSS v3`)
- [x] All Backend packages installed (`pg`, `multer`, `pdfkit`, `uuid`, `cors`, `dotenv`, `nodemon`)
- [x] All Frontend packages installed (`axios`, `react-router-dom`, `lucide-react`, `tailwindcss`)
- [x] Full 9-table PostgreSQL schema written (`src/config/init.sql`)
- [x] Seed data written (2 Departments: AIML + CSE, 7 demo users)
- [x] `StorageService` interface (S3-ready, Local implementation)
- [x] `AuthService` (mock — demo user listing)
- [x] `SubmissionService` (JSONB + file handling, CRUD)
- [x] `ApprovalService` (approve/reject + audit log + notifications)
- [x] `NewsletterService` (assembly + PDFKit generation + publish + archive)
- [x] `NotificationService` (DB-first, unread count)
- [x] All controllers (auth, submissions, approvals, newsletters, notifications)
- [x] All Express routes with role-based access control
- [x] `mockAuth` middleware (now real `verifyToken` via SSO auth server)
- [x] Global error handler middleware
- [x] `multer.js` config (UUID filenames, 10MB limit, type filtering)
- [x] `server.js` entry point (auto-init DB on first run)
- [x] Tailwind config + global CSS (design tokens, reusable classes)
- [x] `useAuth` hook + `AuthContext` (localStorage-based)
- [x] `useNotifications` hook
- [x] `StatusBadge` component
- [x] `NotificationDropdown` component (with unread count badge)
- [x] `DashboardLayout` (sidebar + role-based nav + top bar)
- [x] `LoginPage` (premium demo account cards grouped by department)
- [x] `DashboardPage` (role-aware stats + recent activity)
- [x] `MySubmissionsPage` (list with status badges)
- [x] `NewSubmissionPage` (dynamic fields per type, Save Draft + Submit)
- [x] `ApprovalsPage` (review modal, approve/reject, remarks)
- [x] `GenerationPage` (3-panel: newsletter list, approved pool, selected items)
- [x] `PublicationPage` (generate PDF → preview → publish)
- [x] `ArchivesPage` (search by month/year, view + download PDF)
- [x] `App.jsx` (router with PrivateRoute + adminOnly guard)
- [x] `constants.js` (SUBMISSION_TYPES with dynamic fields, STATUS_CLASSES, MONTHS)
- [x] `formatters.js` (formatDate, formatDistanceToNow)
- [x] `api.js` (Axios instance with auto x-user-id header injection)

---

## ⏳ Pending / Blocked

### 🔴 IMMEDIATE BLOCKER

- [ ] Fill PostgreSQL credentials in `Backend/.env`
  ```
  DB_HOST=
  DB_PORT=5432
  DB_NAME=newsflow_db
  DB_USER=
  DB_PASSWORD=
  ```
- [ ] Create the PostgreSQL database: `CREATE DATABASE newsflow_db;`
- [ ] Start Backend: `npm run dev` (inside `Backend/`)
- [ ] Start Frontend: `npm run dev` (inside `Frontend/`)

---

### 🟡 Minor Fixes / Polish (After DB is Running)

- [ ] Test end-to-end flow (Login → Submit → Approve → Assemble → Publish)
- [ ] Verify PDF generation output and layout
- [ ] Add `EditSubmissionPage.jsx` (for editing Draft submissions — linked but not built yet)
- [ ] Add loading skeletons / better empty states across pages
- [ ] Add `.gitignore` (exclude `node_modules`, `.env`, `uploads/`)
- [x] ~~Notification route ordering bug~~ **FIXED** — `/read-all` now before `/:id/read`

### ✅ SSO Integration Fixes (24 June 2026)

- [x] `useAuth.jsx` — set `user` cookie via `js-cookie` after login; clear on logout
- [x] `middlewares/auth.js` — DB lookup by email populates `department_id` + `role` from local Users table
- [x] `routes/notifications.js` — fixed `PATCH /read-all` route ordering
- [x] `scripts/smoke-test.js` — created smoke test (health + DB + auth server)
- [x] `package.json` — added `test:smoke` npm script

---

### 🟢 Future Modules (Post-MVP)

- [ ] Real JWT Authentication (replace mock auth)
- [ ] `EditSubmissionPage.jsx` — edit Draft submissions
- [ ] PDF template branding (College logo, colors)
- [ ] Newsletter item reordering (drag-and-drop)
- [ ] Socket.io real-time notifications
- [ ] S3 storage migration (swap `StorageService` implementation only)
- [ ] `Newsletter_Content` table (for HTML/Email/Mobile output)
- [ ] Email distribution system
- [ ] AI newsletter summary generation
- [ ] Multi-college support

---

## 📁 Project Structure

```
d:\CBPS\NewsLetter\
├── Backend/
│   ├── src/
│   │   ├── config/        db.js · multer.js · init.sql
│   │   ├── controllers/   auth · submissions · approvals · newsletters · notifications
│   │   ├── middlewares/   auth.js · errorHandler.js
│   │   ├── models/
│   │   ├── routes/        auth · submissions · approvals · newsletters · notifications
│   │   ├── services/      Auth · Submission · Approval · Newsletter · Storage · Notification
│   │   ├── utils/         initDB.js · formatters.js
│   │   └── app.js
│   ├── uploads/
│   ├── .env               ← FILL IN DB CREDENTIALS
│   ├── package.json
│   └── server.js
│
└── Frontend/
    ├── src/
    │   ├── components/    StatusBadge · NotificationDropdown
    │   ├── hooks/         useAuth · useNotifications
    │   ├── layouts/       DashboardLayout
    │   ├── pages/
    │   │   ├── Auth/        LoginPage
    │   │   ├── Dashboard/   DashboardPage
    │   │   ├── Submissions/ MySubmissionsPage · NewSubmissionPage
    │   │   ├── Approvals/   ApprovalsPage
    │   │   ├── Generation/  GenerationPage
    │   │   ├── Publication/ PublicationPage
    │   │   └── Archives/    ArchivesPage
    │   ├── services/      api.js
    │   └── utils/         constants.js · formatters.js
    ├── App.jsx
    ├── main.jsx
    └── index.css
```

---

## 🚀 How To Run

```bash
# Terminal 1 — Backend
cd d:\CBPS\NewsLetter\Backend
# (fill .env first)
node server.js

# Terminal 2 — Frontend
cd d:\CBPS\NewsLetter\Frontend
npm run dev
```

Frontend runs at: http://localhost:5173
Backend runs at: http://localhost:5000
API Health Check: http://localhost:5000/api/health
