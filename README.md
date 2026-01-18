# Product Page Intelligence System

Enterprise-grade SaaS platform for Product Page Optimization and SEO auditing.

## Features

- **Multi-Workspace Architecture**: Organize teams and projects with RBAC (Owner/Admin/Member roles)
- **Bulk URL Auditing**: Process 100-1000 product page URLs per batch
- **20+ SEO Checks**: Comprehensive analysis covering:
  - Indexability (HTTP status, robots, canonical)
  - Metadata (title, description optimization)
  - Content (headings, images, word count)
  - Schema.org (Product, Offer, Reviews)
  - Variant Risk (URL cleanliness, duplicates)
  - AI Readiness (structured specs, FAQs)
- **Real-time Progress**: Live polling of audit batch status
- **Beautiful Dashboard**: Modern UI with score visualizations

## Tech Stack

### Backend (`apps/api`)

- **Framework**: NestJS 10
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT + Google OAuth via Passport.js
- **HTML Parsing**: Cheerio

### Frontend (`apps/web`)

- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **State**: TanStack Query
- **Styling**: TailwindCSS
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 20.x
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
cd apps/api && npx prisma generate

# Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit .env with your database URL and secrets
```

### Environment Variables

#### Backend (`apps/api/.env`)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ppi_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-characters"
JWT_REFRESH_EXPIRES_IN="7d"
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"
FRONTEND_URL="http://localhost:5173"
PORT=3000
```

### Database Setup

```bash
# Run migrations
cd apps/api && npx prisma migrate dev --name init

# (Optional) Seed database
npx prisma db seed
```

### Development

```bash
# Start both servers (from root)
npm run dev

# Or start individually:
# Terminal 1 - API (port 3000)
cd apps/api && npm run start:dev

# Terminal 2 - Web (port 5173)
cd apps/web && npm run dev
```

## Project Structure

```
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── prisma/         # Database schema & migrations
│   │   └── src/
│   │       ├── auth/       # JWT & Google OAuth
│   │       ├── users/      # User management
│   │       ├── workspaces/ # Multi-tenant workspaces
│   │       ├── projects/   # Projects per workspace
│   │       ├── pages/      # Product page management
│   │       └── audits/     # Audit engine & checks
│   └── web/                 # React frontend
│       └── src/
│           ├── components/ # Reusable UI components
│           ├── pages/      # Route pages
│           └── lib/        # API client, auth, utils
└── packages/
    └── shared/             # Shared TypeScript types
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - Google OAuth callback

### Workspaces

- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:id` - Get workspace details
- `PATCH /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

### Projects

- `GET /api/workspaces/:id/projects` - List projects
- `POST /api/workspaces/:id/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/:id/stats` - Get project statistics

### Pages

- `GET /api/projects/:id/pages` - List pages
- `POST /api/projects/:id/pages` - Add single page
- `POST /api/projects/:id/pages/import` - Bulk import (up to 1000 URLs)
- `DELETE /api/pages/bulk-delete` - Bulk delete pages

### Audits

- `POST /api/projects/:id/audits` - Start batch audit
- `GET /api/audits/batch/:id` - Get batch status
- `GET /api/audits/:id` - Get audit run details
- `POST /api/pages/:id/audit` - Audit single page

## Deployment

### Vercel (Frontend)

1. Connect your GitHub repo to Vercel
2. Set root directory to `apps/web`
3. Framework preset: Vite
4. Build command: `npm run build`
5. Output directory: `dist`

### Railway/Render (Backend)

1. Create PostgreSQL database
2. Deploy `apps/api` directory
3. Set environment variables
4. Run `npx prisma migrate deploy` on startup

## License

MIT
