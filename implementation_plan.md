# WorkOS — All-in-One Execution Platform

## Overview

WorkOS is an enterprise-grade SaaS platform for startups, business teams, founders, and innovation teams to manage everything from a single dashboard. It acts as an operating system for workflow management.

---

## Architecture Overview

```
WorkOS
├── Frontend (React + Vite + TypeScript + Tailwind + ShadCN)
├── Backend (Node.js + Express + TypeScript)
├── Database (MongoDB + Mongoose)
├── Real-time (Socket.IO)
├── Storage (Cloudinary)
└── Email (Nodemailer)
```

**Hierarchy:**
```
Organization → Workspace → Main Tabs → Sub Tabs → Projects → Tasks → Sub Tasks
```

---

## Execution Phases

### Phase 1 — Project Structure & Setup
- Initialize Vite + React + TypeScript frontend
- Initialize Node.js + Express + TypeScript backend
- Configure Tailwind CSS + ShadCN UI
- Set up folder structure (feature-based, atomic design)
- Configure ESLint, Prettier, TypeScript strict mode
- Set up environment variables

### Phase 2 — Database Design
- MongoDB collections with Mongoose schemas
- Relationships and indexes
- Base repository pattern

**Collections:**
- `users` — auth, roles, profile
- `organizations` — org metadata
- `workspaces` — workspace per org
- `mainTabs` — tabs inside workspace
- `subTabs` — sub-tabs inside main tabs
- `projects` — project inside sub-tab
- `tasks` — tasks inside project
- `subTasks` — sub-tasks inside tasks
- `activityLogs` — universal audit trail
- `notifications` — real-time + email
- `expenses` / `income` — finance module
- `goals` — progress tracking
- `emails` — email queue/log
- `meetings` / `calendarEvents`
- `comments` / `discussions`
- `documents` / `attachments`
- `roles` / `permissions`
- `scrapedCompetitions`
- `analytics`

### Phase 3 — Backend APIs
- RESTful API with Express Router
- Controller → Service → Repository pattern
- Pagination, filtering, sorting
- File upload (Multer + Cloudinary)
- Web scraping (Cheerio)

### Phase 4 — Authentication System
- JWT + Refresh Token rotation
- RBAC (Admin, Manager, Member, Viewer)
- Email verification
- Password reset
- Invite system

### Phase 5 — Frontend Foundation
- Design system (Tailwind config, color tokens)
- ShadCN component library setup
- Layout: Sidebar + Header + Main Content
- Dark/Light mode toggle
- Routing (React Router v6)
- Redux Toolkit store + slices
- React Query setup
- Axios interceptors

### Phase 6 — Dashboard
- Today's Tasks widget
- Upcoming Deadlines widget
- Revenue / Expenses / Profit cards
- Activity Feed
- Goals progress
- Calendar mini-view
- Quick Actions panel
- Recent Documents
- Performance charts (Recharts)

### Phase 7 — Workspace System
- Workspace CRUD
- Main Tab management
- Sub Tab management
- Project creation with web scraping
- Project detail page (all sections)

### Phase 8 — Task Management
- Task CRUD with full metadata
- Kanban Board view
- Table View
- Calendar View
- List View
- Timeline View
- Sub-tasks & Checklists
- Comments & Mentions

### Phase 9 — Finance Module
- Expense categories per project
- Income tracking
- ROI calculation
- Expense charts
- Reports export (PDF/Excel)

### Phase 10 — Analytics
- Competition success rate
- Revenue/Expenses/Profit charts
- Member productivity
- Task distribution
- Monthly trends

### Phase 11 — Notifications & Email
- Socket.IO real-time notifications
- Notification center
- Email templates (Nodemailer)
- Automation triggers
- Node Cron scheduling

### Phase 12 — Documents & Calendar
- File upload + preview
- Folder structure
- Version history
- Calendar with events
- Discussion system

---

## Folder Structure

### Frontend (`/client`)
```
src/
├── assets/
├── components/
│   ├── ui/           # ShadCN primitives
│   ├── common/       # Shared components
│   └── layout/       # Layout components
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── workspace/
│   ├── tasks/
│   ├── finance/
│   ├── analytics/
│   ├── documents/
│   ├── calendar/
│   ├── notifications/
│   └── settings/
├── hooks/
├── store/            # Redux slices
├── services/         # API calls
├── types/
├── utils/
├── lib/
└── pages/
```

### Backend (`/server`)
```
src/
├── config/
├── controllers/
├── services/
├── repositories/
├── models/
├── routes/
├── middlewares/
├── validators/
├── types/
├── dtos/
├── utils/
├── jobs/             # Cron jobs
├── emails/           # Templates
└── sockets/          # Socket.IO handlers
```

---

## Key Design Decisions

> [!IMPORTANT]
> **Monorepo structure**: Both `client/` and `server/` will live inside a single root `Work_Tracker/` directory for ease of development.

> [!NOTE]
> **Web Scraping**: Using Cheerio (lightweight) for competition URL scraping. Playwright support will be scaffolded but commented out (requires browser binaries).

> [!NOTE]
> **Storage**: Cloudinary for file uploads in Phase 1. AWS S3 will be structured as a configurable provider.

> [!WARNING]
> **Environment**: MongoDB Atlas connection string, Cloudinary keys, JWT secrets, and SMTP credentials must be provided via `.env` files.

---

## UI Design System

- **Primary**: Indigo/Violet gradient palette
- **Dark Mode**: Default dark theme, toggleable
- **Fonts**: Inter (body), JetBrains Mono (code)
- **Inspiration**: Linear, Notion, ClickUp, Vercel Dashboard
- **Components**: Rounded cards, soft shadows, glassmorphism panels
- **Animations**: Framer Motion page transitions, micro-interactions

---

## Verification Plan

### Per Phase
- TypeScript compilation (no errors)
- API testing with test scripts
- Component rendering validation
- Responsive design checks

### Final
- Full user flow walkthrough
- RBAC permission testing
- Real-time socket testing
- Email trigger testing

---

## Open Questions

> [!IMPORTANT]
> **Q1**: Do you have a MongoDB Atlas connection string ready, or should I scaffold with a local MongoDB setup using connection string placeholder?

> [!IMPORTANT]
> **Q2**: Do you have Cloudinary credentials ready for file uploads, or should I use a placeholder/mock for now?

> [!IMPORTANT]
> **Q3**: For email (Nodemailer), do you have an SMTP provider ready (e.g., Gmail, SendGrid, Resend)? Or should I scaffold with placeholder config?

> [!NOTE]
> **Q4**: Should the initial build use mock data / seeded database data for the dashboard and analytics, or should everything be purely API-driven from day one?

> [!NOTE]
> **Q5**: Do you want me to build all 12 phases in a single execution, or review and approve phase by phase?
