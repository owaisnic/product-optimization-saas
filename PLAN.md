# Product Page Intelligence System - Implementation Plan

## 1. Project Overview

### What This Is

An enterprise-grade SaaS platform for **Product Page Optimization** that makes product pages:

- **Semantically legible** (entities + attributes + relationships)
- **Intent-complete** (transactional, commercial, informational, navigational)
- **Machine-readable** (schema markup + clean technical signals)
- **Trust-rich** (reviews/UGC + policies + proof)
- **AI-citable** (clear facts + Q&A + consistency for LLM visibility)

### Core Value Proposition

Automated scoring, monitoring, and prioritization of product page SEO health at scale (100–1000+ URLs per project).

---

## 2. Requirements Summary

### Authentication & Authorization

- **JWT authentication** (access + refresh tokens)
- **Google OAuth** (social login)
- **Multi-workspace** with member management
- **RBAC roles**: Owner, Admin, Member

### Core Features

| Feature        | Description                                             |
| -------------- | ------------------------------------------------------- |
| Workspaces     | Multi-tenant isolation, invite members                  |
| Projects       | One workspace can have multiple projects (stores/sites) |
| Product Pages  | URLs to audit, with optional SKU/variant grouping       |
| Bulk Import    | CSV upload for 100–1000 URLs at once                    |
| Audit Engine   | Automated checks that produce scores + issues           |
| Scoring Model  | Weighted category scores → overall 0–100 score          |
| Issue Tracking | Severity, fix hints, evidence, priority                 |
| Monitoring     | Re-run audits on schedule, detect regressions           |

### Audit Check Categories

1. **Metadata** — title, meta description, canonical, robots
2. **Schema** — Product, Offer, Review, FAQ presence + validation
3. **Indexability** — HTTP status, robots, canonical conflicts
4. **Performance** — page speed signals (phase 2: PSI API)
5. **Content** — H1, image alt coverage, content length
6. **Variant Risk** — duplicate detection, similar URLs
7. **AI Readiness** — structured facts, Q&A, consistency

---

## 3. Technical Stack

### Backend (`apps/api`)

| Layer           | Technology                                     |
| --------------- | ---------------------------------------------- |
| Framework       | NestJS (TypeScript)                            |
| ORM             | Prisma                                         |
| Database        | PostgreSQL (Vercel Postgres / Neon / Supabase) |
| Auth            | Passport.js (JWT + Google OAuth)               |
| Validation      | class-validator, class-transformer             |
| Testing         | Jest + Supertest                               |
| Queue (phase 2) | BullMQ for background audit jobs               |

### Frontend (`apps/web`)

| Layer       | Technology                                |
| ----------- | ----------------------------------------- |
| Framework   | React 18 + TypeScript                     |
| Build       | Vite 6 (Node 20.18 compatible)            |
| Styling     | TailwindCSS                               |
| Components  | shadcn/ui (Radix primitives)              |
| Icons       | Lucide React                              |
| Routing     | React Router v6                           |
| State/Fetch | TanStack Query (polling for audit status) |
| Forms       | React Hook Form + Zod                     |
| Testing     | Vitest + React Testing Library            |

### Shared (`packages/shared`)

- TypeScript types (DTOs, enums, interfaces)
- Shared between frontend and backend

### Deployment

| Target   | Platform                                           |
| -------- | -------------------------------------------------- |
| Frontend | Vercel (static/SSR)                                |
| Backend  | Vercel Serverless Functions or separate deployment |
| Database | Vercel Postgres / Neon / Supabase                  |

---

## 4. Data Model (Prisma Schema)

```prisma
// ============== AUTH & TENANCY ==============

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String?  // null if OAuth-only
  name          String?
  avatarUrl     String?
  googleId      String?  @unique

  memberships   WorkspaceMember[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Workspace {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique

  members     WorkspaceMember[]
  projects    Project[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model WorkspaceMember {
  id          String   @id @default(cuid())
  role        Role     @default(MEMBER)

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  workspaceId String

  createdAt   DateTime @default(now())

  @@unique([userId, workspaceId])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}

// ============== PROJECTS & PAGES ==============

model Project {
  id          String   @id @default(cuid())
  name        String
  domain      String?  // e.g., "example.com"

  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  workspaceId String

  pages       ProductPage[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ProductPage {
  id            String   @id @default(cuid())
  url           String
  normalizedUrl String   // lowercase, no trailing slash, no query params
  sku           String?
  variantGroup  String?  // group related variants

  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId     String

  audits        AuditRun[]
  latestScore   Int?     // cached latest score for quick filtering

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([projectId, normalizedUrl])
}

// ============== AUDIT SYSTEM ==============

model AuditBatch {
  id          String   @id @default(cuid())
  status      BatchStatus @default(QUEUED)
  totalUrls   Int
  completed   Int      @default(0)
  failed      Int      @default(0)

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId   String

  runs        AuditRun[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum BatchStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
}

model AuditRun {
  id          String   @id @default(cuid())
  status      AuditStatus @default(QUEUED)

  page        ProductPage @relation(fields: [pageId], references: [id], onDelete: Cascade)
  pageId      String

  batch       AuditBatch? @relation(fields: [batchId], references: [id], onDelete: SetNull)
  batchId     String?

  // Raw fetched data (stored for debugging/re-scoring)
  httpStatus  Int?
  htmlSnapshot String?  @db.Text // store relevant extracted HTML

  // Results
  score       AuditScore?
  checks      AuditCheckResult[]

  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
}

enum AuditStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
}

model AuditScore {
  id              String   @id @default(cuid())
  overall         Int      // 0-100

  // Category scores (0-100 each)
  metadata        Int
  schema          Int
  indexability    Int
  content         Int
  variantRisk     Int
  aiReadiness     Int

  auditRun        AuditRun @relation(fields: [auditRunId], references: [id], onDelete: Cascade)
  auditRunId      String   @unique
}

model AuditCheckResult {
  id          String   @id @default(cuid())
  checkId     String   // e.g., "title_present", "schema_product"
  category    String   // e.g., "metadata", "schema"
  status      CheckStatus
  severity    Severity
  message     String
  evidence    String?  @db.Text // JSON: extracted values, expected vs actual
  fixHint     String?

  auditRun    AuditRun @relation(fields: [auditRunId], references: [id], onDelete: Cascade)
  auditRunId  String

  @@index([auditRunId, category])
}

enum CheckStatus {
  PASS
  WARN
  FAIL
  SKIP
}

enum Severity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFO
}
```

---

## 5. API Design (REST Endpoints)

### Auth

| Method | Endpoint                | Description                  |
| ------ | ----------------------- | ---------------------------- |
| POST   | `/auth/signup`          | Register with email/password |
| POST   | `/auth/login`           | Login, returns JWT tokens    |
| POST   | `/auth/refresh`         | Refresh access token         |
| GET    | `/auth/google`          | Initiate Google OAuth        |
| GET    | `/auth/google/callback` | Google OAuth callback        |
| GET    | `/auth/me`              | Get current user             |

### Workspaces

| Method | Endpoint          | Description                   |
| ------ | ----------------- | ----------------------------- |
| GET    | `/workspaces`     | List user's workspaces        |
| POST   | `/workspaces`     | Create workspace              |
| GET    | `/workspaces/:id` | Get workspace details         |
| PATCH  | `/workspaces/:id` | Update workspace              |
| DELETE | `/workspaces/:id` | Delete workspace (owner only) |

### Workspace Members

| Method | Endpoint                            | Description              |
| ------ | ----------------------------------- | ------------------------ |
| GET    | `/workspaces/:id/members`           | List members             |
| POST   | `/workspaces/:id/members`           | Invite member (by email) |
| PATCH  | `/workspaces/:id/members/:memberId` | Update role              |
| DELETE | `/workspaces/:id/members/:memberId` | Remove member            |

### Projects

| Method | Endpoint                     | Description         |
| ------ | ---------------------------- | ------------------- |
| GET    | `/workspaces/:wsId/projects` | List projects       |
| POST   | `/workspaces/:wsId/projects` | Create project      |
| GET    | `/projects/:id`              | Get project details |
| PATCH  | `/projects/:id`              | Update project      |
| DELETE | `/projects/:id`              | Delete project      |

### Product Pages

| Method | Endpoint                     | Description                        |
| ------ | ---------------------------- | ---------------------------------- |
| GET    | `/projects/:id/pages`        | List pages (paginated, filterable) |
| POST   | `/projects/:id/pages`        | Add single page                    |
| POST   | `/projects/:id/pages/import` | Bulk import (CSV body)             |
| GET    | `/pages/:id`                 | Get page details                   |
| DELETE | `/pages/:id`                 | Delete page                        |

### Audits

| Method | Endpoint               | Description                               |
| ------ | ---------------------- | ----------------------------------------- |
| POST   | `/projects/:id/audits` | Start batch audit (all pages or filtered) |
| GET    | `/projects/:id/audits` | List audit batches                        |
| GET    | `/audits/batch/:id`    | Get batch status + progress               |
| POST   | `/pages/:id/audit`     | Run single page audit                     |
| GET    | `/pages/:id/audits`    | Get audit history for page                |
| GET    | `/audits/:id`          | Get audit run details (score + checks)    |

### Reports (Phase 2)

| Method | Endpoint               | Description              |
| ------ | ---------------------- | ------------------------ |
| GET    | `/projects/:id/report` | Aggregate project health |
| GET    | `/projects/:id/export` | Export CSV of issues     |

---

## 6. Frontend Architecture

### Pages & Routes

```
/                       → Landing (redirect to /dashboard if logged in)
/login                  → Login page
/signup                 → Signup page
/auth/callback          → OAuth callback handler

/dashboard              → Workspace selector / overview
/w/:workspaceSlug       → Workspace dashboard
/w/:slug/members        → Member management
/w/:slug/projects       → Project list
/w/:slug/projects/new   → Create project

/p/:projectId           → Project dashboard (scores overview)
/p/:projectId/pages     → Product pages list
/p/:projectId/import    → Bulk URL import
/p/:projectId/audits    → Audit batches list

/page/:pageId           → Page detail (audit history, latest results)
/audit/:auditId         → Audit detail (full check breakdown)
```

### UI Components (Enterprise Colorful Theme)

- **Color palette**: Vibrant gradients (purple/blue/teal accents), dark mode support
- **Score displays**: Circular progress, color-coded (green/yellow/red)
- **Issue tables**: Severity badges, expandable evidence panels
- **Charts**: Category breakdown bars, trend lines (phase 2)
- **Empty states**: Illustrated, actionable CTAs

### Key UI Screens

1. **Dashboard** — workspace cards, quick stats
2. **Project Overview** — score donut, category bars, top issues
3. **Pages List** — filterable table, bulk actions, score column
4. **Import Wizard** — CSV upload, preview, validation
5. **Audit Progress** — real-time progress bar, polling status
6. **Audit Results** — score breakdown, issues accordion, evidence viewer

---

## 7. Audit Engine Design

### Check Interface

```typescript
interface CheckDefinition {
  id: string; // "title_present"
  category: Category; // "metadata"
  name: string; // "Title Tag Present"
  description: string;
  severity: Severity; // default severity if fails
  weight: number; // contribution to category score
  run: (context: AuditContext) => CheckResult;
}

interface AuditContext {
  url: string;
  httpStatus: number;
  html: string;
  parsedHead: ParsedHead;
  jsonLd: JsonLdBlock[];
  // ... more extracted data
}

interface CheckResult {
  status: "pass" | "warn" | "fail" | "skip";
  message: string;
  evidence?: Record<string, any>;
  fixHint?: string;
}
```

### Initial Checks (MVP)

| ID                          | Category     | Description               |
| --------------------------- | ------------ | ------------------------- |
| `http_status_ok`            | indexability | HTTP 200 response         |
| `title_present`             | metadata     | Has non-empty title tag   |
| `title_length`              | metadata     | Title 30-60 chars         |
| `meta_desc_present`         | metadata     | Has meta description      |
| `meta_desc_length`          | metadata     | Description 120-160 chars |
| `canonical_present`         | indexability | Has canonical tag         |
| `canonical_self`            | indexability | Canonical points to self  |
| `h1_present`                | content      | Has H1 tag                |
| `h1_single`                 | content      | Only one H1               |
| `images_have_alt`           | content      | All images have alt text  |
| `schema_product`            | schema       | Has Product JSON-LD       |
| `schema_offer`              | schema       | Product has Offer         |
| `schema_offer_price`        | schema       | Offer has price           |
| `schema_offer_availability` | schema       | Offer has availability    |
| `no_noindex`                | indexability | Not blocked by noindex    |

### Scoring Algorithm

```
Category Score = (passed_weight / total_weight) * 100

Overall Score = weighted_average([
  { category: 'metadata', weight: 20 },
  { category: 'schema', weight: 25 },
  { category: 'indexability', weight: 25 },
  { category: 'content', weight: 15 },
  { category: 'variantRisk', weight: 10 },
  { category: 'aiReadiness', weight: 5 },
])
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Current)

- [x] Project plan documentation
- [ ] Monorepo setup (apps/api, apps/web, packages/shared)
- [ ] Prisma schema + database connection
- [ ] Auth module (JWT + Google OAuth)
- [ ] Workspace + Member CRUD
- [ ] Project CRUD
- [ ] Basic frontend shell (auth, routing, layout)

### Phase 2: Core Audit System

- [ ] ProductPage model + bulk import endpoint
- [ ] Audit engine with initial checks
- [ ] Single page audit endpoint
- [ ] Batch audit (sequential processing)
- [ ] Audit results storage + retrieval
- [ ] Frontend: pages list, import wizard, audit trigger

### Phase 3: Results & Visualization

- [ ] Score calculation + caching
- [ ] Frontend: audit results UI (scores, issues, evidence)
- [ ] Frontend: project dashboard with aggregates
- [ ] Polling for batch audit progress

### Phase 4: Polish & Scale

- [ ] Background job queue (BullMQ) for large batches
- [ ] Pagination, filtering, sorting everywhere
- [ ] Export functionality (CSV)
- [ ] Dark mode, responsive design
- [ ] Error handling, loading states, empty states

### Phase 5: Advanced (Future)

- [ ] PageSpeed Insights API integration
- [ ] Google Search Console API integration
- [ ] Scheduled audits + regression alerts
- [ ] AI readiness checks (LLM-based content analysis)
- [ ] Team notifications (email, Slack)

---

## 9. Project Structure

```
product-page-intelligence-system/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/           # Auth module
│   │   │   ├── users/          # Users module
│   │   │   ├── workspaces/     # Workspaces + members
│   │   │   ├── projects/       # Projects module
│   │   │   ├── pages/          # ProductPages module
│   │   │   ├── audits/         # Audit engine + runs
│   │   │   ├── checks/         # Check definitions
│   │   │   ├── prisma/         # Prisma service
│   │   │   └── common/         # Guards, decorators, utils
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── test/
│   │   └── package.json
│   │
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/     # Reusable UI components
│       │   ├── pages/          # Route pages
│       │   ├── hooks/          # Custom hooks
│       │   ├── lib/            # API client, utils
│       │   ├── stores/         # State (if needed)
│       │   └── styles/         # Tailwind config, globals
│       ├── public/
│       ├── index.html
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│       ├── src/
│       │   ├── dto/            # Request/response DTOs
│       │   ├── enums/          # Shared enums
│       │   └── index.ts
│       └── package.json
│
├── package.json                # Root workspace config
├── PLAN.md                     # This file
├── README.md                   # Setup instructions
└── .env.example                # Environment variables template
```

---

## 10. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"

# JWT
JWT_SECRET="your-jwt-secret-min-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="7d"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/auth/google/callback"

# Frontend
VITE_API_URL="http://localhost:3000"

# Optional (Phase 2+)
PAGESPEED_API_KEY=""
REDIS_URL=""
```

---

## 11. Next Steps

1. **Clean up** current broken scaffold (delete node_modules, package-lock)
2. **Scaffold fresh** monorepo with compatible versions
3. **Implement backend** following this plan
4. **Implement frontend** following this plan
5. **Test continuously** as we build

---

_Plan created: 2026-01-19_
_Ready for implementation approval_
