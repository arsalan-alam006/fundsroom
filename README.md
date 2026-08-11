# Mini ERP + CRM Operations Portal

A small internal operations portal for a wholesale/distribution company: customer CRM, product/inventory
management, and a sales challan flow with stock-reduction business logic.

- **Backend:** Node.js, TypeScript, Express, PostgreSQL (Supabase), Prisma ORM, JWT auth, Zod validation
- **Frontend:** React, TypeScript, Vite, React Router, Axios
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Render/Railway (backend), Vercel/Netlify (frontend), Supabase (database)

---

## 1. Architecture overview

```
erp-crm/
├── backend/            Express REST API (TypeScript + Prisma)
│   ├── prisma/schema.prisma   All DB models (User, Customer, Product, StockMovement, Challan, ...)
│   └── src/
│       ├── routes/            auth, customers, products, challans
│       ├── middleware/        JWT auth, role guard, central error handler
│       ├── utils/              jwt helper, ApiError, asyncHandler
│       └── prisma/seed.ts      seeds 4 role-based test users + sample data
├── frontend/           React admin UI (Vite + TS)
│   └── src/
│       ├── pages/              Login, Dashboard, Customers, Products, Challans...
│       ├── context/AuthContext.tsx   login state, role checks
│       └── api/client.ts       Axios instance with JWT auto-attach
└── postman_collection.json   Every API endpoint, ready to import
```

**Request flow:** React calls the Express REST API with a `Bearer <JWT>` header → route middleware
verifies the token and checks the user's role → Zod validates the request body → Prisma runs the DB
query (wrapped in a transaction where stock changes are involved) → JSON response.

**Key business rule — stock integrity:** stock is only ever changed through `StockMovement` records
(manual IN/OUT, or automatically when a challan is confirmed/cancelled), all inside a Prisma
`$transaction`, so the movement log and `Product.currentStock` never drift apart. Every write path
that reduces stock re-checks `currentStock - quantity >= 0` before committing, so stock can never go
negative, whether the challan is confirmed at creation time or later via the "Confirm" action.

**Product snapshotting:** `ChallanItem` stores `productNameSnapshot`, `skuSnapshot`, and
`unitPriceSnapshot` at the time of the challan, not just a foreign key — so historical challans stay
accurate even if a product's name or price changes later.

---

## 2. Set up your Supabase database (do this first)

1. Go to https://supabase.com → create a free account → **New Project**.
2. Set a database password and save it somewhere — you'll need it below.
3. Once the project is created, go to **Project Settings → Database → Connection string**.
4. You need **two** connection strings:
   - **Connection pooling** (Transaction mode, port `6543`, includes `?pgbouncer=true`) → this is your `DATABASE_URL`
   - **Direct connection** (port `5432`) → this is your `DIRECT_URL`
5. Replace `[YOUR-PASSWORD]` in both strings with the database password from step 2.

You'll paste both into `backend/.env` in the next step.

---

## 3. Local setup

### Prerequisites
- Node.js 20+
- A Supabase project (step 2 above)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# open .env and paste in your Supabase DATABASE_URL and DIRECT_URL, and set a JWT_SECRET
npx prisma migrate dev --name init   # creates tables in your Supabase database
npm run seed                         # creates 4 test users + sample customer/product
npm run dev                          # http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:4000 (default is fine locally)
npm run dev                          # http://localhost:5173
```

Open http://localhost:5173 and log in with any of the seeded accounts below.

---

## 4. Test login credentials (all roles)

All seeded accounts share the password **`Password123!`**

| Role       | Email                    |
|------------|---------------------------|
| Admin      | admin@erpcrm.test        |
| Sales      | sales@erpcrm.test        |
| Warehouse  | warehouse@erpcrm.test    |
| Accounts   | accounts@erpcrm.test     |

Role permissions implemented:
- **Admin** — full access to everything.
- **Sales** — manage customers, create/confirm/cancel challans.
- **Warehouse** — manage products and stock movements.
- **Accounts** — read-only access (viewing customers, products, challans), no create/edit rights.

---

## 5. Environment variables

**backend/.env**
| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooled connection string (port 6543, `?pgbouncer=true`) — used at runtime |
| `DIRECT_URL` | Supabase direct connection string (port 5432) — used only for running migrations |
| `JWT_SECRET` | Secret used to sign JWTs — use a long random value in production |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `8h` |
| `PORT` | API port (default 4000) |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins |

**frontend/.env**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |

`.env` files are gitignored; `.env.example` files document the required keys for setup.

---

## 6. Deployment (free-tier)

### Database — Supabase
Already set up in §2. Nothing further to deploy — it's already hosted.

### Backend — Render (or Railway)
1. New Web Service → point at the `backend/` folder as the root directory.
2. Build command: `npm install && npx prisma generate && npm run build`
3. Start command: `npx prisma migrate deploy && npm run seed && node dist/server.js`
   (remove `&& npm run seed` after the first deploy so it doesn't reseed on every restart)
4. Add the environment variables from §5 (your Supabase `DATABASE_URL` / `DIRECT_URL`, `JWT_SECRET`, etc).
5. Note the deployed URL, e.g. `https://erp-crm-api.onrender.com`.

### Frontend — Vercel (or Netlify)
1. New Project → point at the `frontend/` folder as the root directory.
2. Build command: `npm run build`, output directory: `dist`.
3. Environment variable: `VITE_API_URL=https://erp-crm-api.onrender.com`.
4. Deploy. Then update the backend's `CORS_ORIGIN` env var to the resulting frontend URL and redeploy the backend.

---

## 7. Known limitations / not implemented

- No automated test suite (unit/integration tests) — given the tight timeline, manual verification via
  the Postman collection was prioritized over test coverage.
- Accounts role is currently read-only across all modules; a real system would likely give it write
  access to an invoicing/payments module once that's built.
- Pagination exists on list endpoints but the frontend currently loads a single page of up to
  100–200 rows rather than a full paged UI control — fine for the scale of this case study, would
  need real pagination controls for large datasets.
- No rate limiting / refresh tokens — a single JWT with an 8h expiry is used, which is reasonable for
  an internal tool but would want refresh-token rotation for a production system.
- GST number field on Customer isn't format-validated (accepted as free text).
- No Docker setup, CI/CD, PDF invoice export, or image upload — out of scope for this submission.

---

## 8. Assumptions made

- "Simple JWT-based authentication" — no refresh tokens, session revocation, or password-reset flow.
- Challans can be created as `DRAFT` or `CONFIRMED` directly; a draft can later be confirmed (stock
  reduced then) or cancelled. Confirmed challans can also be cancelled, which restores stock — this
  wasn't explicitly required but felt necessary for a usable warehouse workflow.
- Challan numbers are generated as `CH-<year>-<sequence>` (e.g. `CH-2026-000123`).
- "Add multiple products" for a challan is implemented as unlimited line items with independent
  quantities per product.
- Search on customers/products is case-insensitive substring match on the fields listed in the API
  section below.

---

## 9. API summary

All routes except `/auth/login` and `/health` require `Authorization: Bearer <token>`.
Full request/response examples are in `postman_collection.json`.

| Method | Route | Roles | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | returns JWT + user |
| GET | `/auth/me` | any | current user |
| GET | `/customers` | any | `?search=&status=&type=&page=&pageSize=` |
| GET | `/customers/:id` | any | includes follow-up notes |
| POST | `/customers` | Admin, Sales | |
| PUT | `/customers/:id` | Admin, Sales | |
| POST | `/customers/:id/follow-ups` | Admin, Sales | |
| GET | `/products` | any | `?search=&category=&lowStock=true&page=&pageSize=` |
| GET | `/products/:id` | any | includes stock movement log |
| POST | `/products` | Admin, Warehouse | |
| PUT | `/products/:id` | Admin, Warehouse | |
| POST | `/products/:id/stock-movements` | Admin, Warehouse | rejects if OUT would go negative |
| GET | `/challans` | any | `?status=&customerId=&page=&pageSize=` |
| GET | `/challans/:id` | any | |
| POST | `/challans` | Admin, Sales | status `DRAFT` or `CONFIRMED`; validates stock if confirming |
| PATCH | `/challans/:id/confirm` | Admin, Sales | reduces stock, rejects if insufficient |
| PATCH | `/challans/:id/cancel` | Admin, Sales | restores stock if it had been confirmed |

Every error response has the shape `{ "error": { "message": "...", "details"?: ... } }` with an
appropriate HTTP status code (400 validation, 401 auth, 403 role, 404 not found, 409 conflict, 500
unexpected).

---

## 10. Submission checklist mapping

- GitHub repository — push this folder as-is (see the commit guide provided separately).
- Live frontend / backend URLs — see §6 for deployment steps.
- Test login credentials — §4.
- Postman collection — `postman_collection.json` at the repo root.
- README with setup + deployment — this file.
- Architecture explanation — §1.
- Known limitations — §7.
