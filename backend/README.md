# E-Commerce API (backend)

A REST API for an online store, built with **Express**, **TypeScript** and **MongoDB**. It covers the full shopping flow: accounts and email verification, a catalog (categories, subcategories, brands, products), cart, coupons, orders with cash or Stripe card payment, wishlist and reviews.

> To run the whole application (frontend + backend + MongoDB), see the [repository README](../README.md). This file documents the backend itself.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Running the backend](#running-the-backend)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Order and payment flow](#order-and-payment-flow)
- [Conventions](#conventions)

---

## Features

- **Accounts**: sign up, email confirmation (with resend), login, password reset by emailed code.
  - Login requires a confirmed email and returns the same error for an unknown email or a wrong password.
  - Reset codes expire after 10 minutes and allow 5 guesses.
  - Resetting the password logs out every existing session. Blocked or deleted accounts are rejected.
- **Roles**: `User` (customer) and `Admin`. Catalog management and delivery updates are admin-only.
- **Catalog**: categories → subcategories → products, plus brands. Images are stored on Cloudinary.
- **Product listing**: filtering, full-text-style search, sorting, field selection and pagination.
- **Cart**: add, update quantity, remove items, clear.
- **Coupons**: percentage discounts with an expiry date, usable once per customer.
- **Orders**: cash on delivery or card through Stripe Checkout. Stock, coupon usage and the cart are updated in a single MongoDB transaction.
- **Safe retries**: order creation accepts an `Idempotency-Key` header, so a double click or network retry never creates a second order.
- **Stripe webhooks**: paid sessions place the order; expired sessions reject it and return the stock. A payment that arrives after the order was canceled is refunded automatically.
- **Abuse protection**: rate limits on login, signup and password reset, shared by every instance.
- **Notifications**: placing an order stores an in-app notification for the customer and one for each admin. Notifications are written in the same transaction as the order and deleted automatically after 90 days.
- **Wishlist and reviews**: a user can review a product only after it was delivered to them, once per product.

## Tech stack

| Area | Choice |
| --- | --- |
| Runtime | Node.js 24, ES modules |
| Language | TypeScript (strict) |
| Web framework | Express 4 |
| Database | MongoDB with Mongoose 6 (replica set required) |
| Validation | Joi |
| Auth | JWT (`jsonwebtoken`), passwords hashed with `bcryptjs` |
| Payments | Stripe Checkout + webhooks |
| File uploads | Multer (OS temp dir) → Cloudinary |
| Email | Nodemailer (Gmail or any SMTP provider) |
| Packaging | Docker (multi-stage: `development` / `production` targets) |

## Architecture

The code is organized in layers. Each request flows top to bottom, and each layer only talks to the one below it.

```
HTTP request
   │
   ▼
Router        routes, auth guard, file upload, Joi validation        (*.router.ts)
   │
   ▼
Controller    reads the request, calls a service, shapes the response (*.controller.ts)
   │
   ▼
Service       business rules; owns one collection                    (*.service.ts)
   │
   ├──► other services (another module's model only for read-only existence checks)
   ├──► infrastructure via interfaces: IMailer, IImageStorage, IPaymentGateway, ...
   ▼
Mongoose model                                                       (src/db/models)
```

Key ideas:

- **Composition root**: [src/container.ts](src/container.ts) is the only place that creates objects and wires them together. Every class receives its dependencies through its constructor, so any of them can be replaced by a fake in tests.
- **Dependency inversion**: services depend on interfaces in [src/core/contracts.ts](src/core/contracts.ts), not on Stripe, Cloudinary or Nodemailer directly. The concrete implementations live in [src/integrations](src/integrations). Stripe types never leave `PaymentService`.
- **One owner per collection**: a service writes only its own collection. For example, `OrderService` reserves stock through `ProductService.reserveStock()` and records a coupon use through `CouponService.claim()`. User reads go through `UserService`, which also holds the single "may this account sign in" rule.
- **Base classes** in [src/core](src/core):
  - `BaseRouter`: builds the Express router and provides the `authenticated()` and `adminOnly()` guards.
  - `BaseController`: binds handlers and forwards async errors to the error handler.
  - `BaseService`: `findOrFail`, `paginate`, `transaction` and other shared helpers.
- **Errors**: services throw `AppError(message, status)`, and one global handler turns every error (including Mongoose, duplicate-key, JSON and upload errors) into the same JSON shape and logs every 5xx with its request id.
- **Validation**: each route's Joi schema validates body, query and params together, then writes the converted values back, so handlers read exactly what was validated.

## Project structure

```
backend/
├── index.ts                  # server entry: env check, start, background jobs, graceful shutdown
├── src/
│   ├── app.ts                # Express app: security middleware, /health, routes, error handler
│   ├── container.ts          # composition root (dependency wiring)
│   ├── loadEnv.ts            # loads backend/.env, then the repository root .env
│   ├── core/                 # base classes, AppError, ErrorHandler, Env, interfaces
│   ├── db/                   # MongoDB connection and Mongoose models
│   ├── middleware/           # auth guard, Joi validator, uploads, rate limits
│   ├── integrations/         # Stripe, Cloudinary, email, JWT, hashing
│   ├── modules/              # one folder per feature
│   │   ├── auth/  brand/  cart/  category/  coupon/
│   │   ├── notification/  order/  product/  review/
│   │   ├── subcategory/  user/
│   ├── jobs/                 # scheduled work (unpaid order sweep)
│   ├── scripts/              # migrate, one-off job runs
│   ├── types/                # shared types
│   └── utils/                # pagination, allowlisted list queries, slug
├── tests/                    # integration tests (Vitest + in-memory MongoDB)
├── Dockerfile                # development / build / production stages
└── .dockerignore
```

Each module follows the same pattern: `x.router.ts`, `x.controller.ts`, `x.service.ts`, `x.validation.ts`.

## Running the backend

**With Docker (recommended)**: from the repository root, `docker compose up` starts MongoDB, this API (hot reload) and the frontend. See the [repository README](../README.md).

**On the host** (Node.js 24 required):

```bash
# from the repository root, once: cp .env.example .env  (and fill it in)
docker compose up -d mongo          # or point DB_LOCAL at any replica set, e.g. Atlas
cd backend
npm ci
npm run dev                         # http://localhost:5000, hot reload with tsx
```

`DB_LOCAL` in `.env.example` already points at the compose MongoDB from the host (`localhost:27017` with `directConnection=true`).

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with hot reload (tsx) |
| `npm run typecheck` | Type-check without emitting |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled app (`dist/index.js`) |
| `npm test` | Run the integration tests (downloads a MongoDB binary on first run) |
| `npm run migrate` | Migrate data and sync indexes (run once per database after upgrading; safe to re-run) |
| `npm run job:expire-orders` | Run one sweep of unpaid card orders (the server also runs it every 5 minutes) |

In the production image (no dev dependencies, no tsx), run the compiled scripts instead: `node dist/src/scripts/migrate.js` and `node dist/src/scripts/expireStaleOrders.js`.

There are no seed scripts: create an admin by signing up and setting `role: "Admin"` on that user in MongoDB.

## Configuration

All configuration comes from environment variables. Outside Docker they are loaded from `backend/.env` (if present) and then the repository root `.env`; variables already set in the environment always win. Inside Docker they come from the compose file and the root `.env`, and no `.env` file is ever copied into an image. [../.env.example](../.env.example) lists every variable with a placeholder. The app checks the required ones at startup and refuses to start if any are missing.

| Variable | Purpose |
| --- | --- |
| `DB_LOCAL` | MongoDB connection string (replica set) |
| `PORT` | HTTP port (default `5000`) |
| `MOOD` | `DEV` adds stack traces to error responses; never use it in production |
| `BEARER_KEY` | Prefix expected in the `Authorization` header |
| `TOKEN_SIGNATURE` | JWT signing secret for login tokens |
| `EMAIL_TOKEN` | JWT signing secret for email-confirmation links |
| `SALT_ROUND` | bcrypt cost factor (minimum 10) |
| `ACCESS_TOKEN_EXPIRES_IN` | Optional access token lifetime in seconds (default 900 = 15 minutes) |
| `REFRESH_TOKEN_EXPIRES_IN` | Optional refresh token lifetime in seconds (default 2592000 = 30 days) |
| `gmail`, `gmailPass` | Gmail sender account, used when `SMTP_HOST` is not set |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Any SMTP provider (SES, SendGrid, Mailgun...); recommended in production |
| `MAIL_FROM` | Optional sender, e.g. `"Shop" <no-reply@example.com>` |
| `API_KEY`, `API_SECRET`, `CLOUD_NAME` | Cloudinary credentials |
| `Secret_Key`, `endpointSecret` | Stripe secret key and webhook signing secret |
| `FE_URL` | Frontend URL used in redirects and Stripe success URL |
| `CORS_ORIGINS` | Optional comma-separated browser origins allowed by CORS (default: `FE_URL`) |
| `TRUST_PROXY` | Number of reverse proxies in front of the app (`1` behind the frontend nginx or a load balancer). Rate limits use the client IP, so leave it unset when clients connect directly |
| `API_PUBLIC_URL` | Optional public base URL of this API, used for links in emails (e.g. `https://shop.example.com/api`). Defaults to the request's host; needed behind a proxy or path prefix |

`GET /health` returns `{"status":"ok"}` (200) while the database is connected and `{"status":"unavailable"}` (503) otherwise. Docker healthchecks use it.

## API reference

**Auth header**: protected routes expect `Authorization: <BEARER_KEY><token>`. With `BEARER_KEY=Bearer__`, that is `Authorization: Bearer__eyJhbGci...`.

**Paths**: the API itself is mounted at the root (`/auth`, `/product`...). The bundled frontend reaches it as `/api/auth`, `/api/product`... through its proxy, which strips the `/api` prefix.

**Access**: 🌐 public · 👤 any logged-in user · 🔒 admin only

**Tokens**: login returns two tokens.

- The **access token** (a JWT, 15 minutes) goes in the `Authorization` header.
- The **refresh token** (30 days) is only sent to `POST /auth/refresh`.
- When a request returns 401, call `/auth/refresh` once, store **both** new tokens, and retry the request.
- Each refresh token works only once. If an already-used one is sent again, it is treated as stolen and that login's whole session is revoked.
- Exception: the same refresh token sent again within 30 seconds (parallel tabs, a retry after a timeout) gets a fresh pair instead.
- Resetting the password ends every session.

**Rate limits** (per client IP, shared across instances; exceeding one returns `429`): login 10 per 15 minutes per IP and per email, signup 5 per hour, `sendCode` 5 per hour per IP and 3 per email, `forgetPassword` 10 per 15 minutes, refresh 60 per 15 minutes.

### Auth: `/auth`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/signup` | 🌐 | Create an account and send a confirmation email |
| GET | `/confirmEmail/:token` | 🌐 | Confirm the email (link from the email) |
| GET | `/NewConfirmEmail/:token` | 🌐 | Resend the confirmation email |
| POST | `/login` | 🌐 | Returns `accessToken`, `refreshToken`, `expiresIn` and basic user info |
| POST | `/refresh` | 🌐 | `{ refreshToken }` → a new access and refresh token pair |
| POST | `/logout` | 🌐 | `{ refreshToken }` → ends that session |
| PATCH | `/sendCode` | 🌐 | Email a password-reset code |
| PATCH | `/forgetPassword` | 🌐 | Reset the password using the code |
| GET | `/` | 🔒 | List users (paginated, without passwords or reset codes) |

### Catalog

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/category` | 🌐 | List categories |
| POST | `/category` | 🔒 | Create (multipart, `image` field) |
| PUT | `/category/:categoryId` | 🔒 | Update |
| DELETE | `/category` | 🔒 | Delete (`categoryId` in body); `409` while it still has subcategories or products |
| GET | `/subcategory` or `/category/:categoryId/subcategory` | 🌐 | List all subcategories, or only that category's |
| POST | `/category/:categoryId/subcategory` | 🔒 | Create |
| PUT | `/category/:categoryId/subcategory/:subcategoryId` | 🔒 | Update |
| GET | `/brand` | 🌐 | List brands |
| POST | `/brand` | 🔒 | Create (multipart, `image` field) |
| PUT | `/brand/:brandId` | 🔒 | Update |
| DELETE | `/brand` | 🔒 | Delete (`brandId` in body); `409` while products still use it |
| GET | `/product` | 🌐 | List, filter, search, sort, paginate |
| GET | `/product/:productId` | 🌐 | One product (`404` if deleted) |
| POST | `/product` | 🔒 | Create (multipart: `mainImage` ×1, `subImages` ≤5) |
| PUT | `/product/:productId` | 🔒 | Update |

### Shopping

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/cart` | 👤 | Get my cart |
| POST | `/cart` | 👤 | Add a product or set its quantity: `{ productId, quantity }` |
| PATCH | `/cart/:productId/remove` | 👤 | Remove a product |
| DELETE | `/cart/deleteCart` | 👤 | Empty the cart |
| GET | `/product/wishlist` | 👤 | My wishlisted products (deleted products are left out) |
| PATCH | `/product/:productId/wishlist/add` | 👤 | Add to wishlist |
| PATCH | `/product/:productId/wishlist/remove` | 👤 | Remove from wishlist |
| GET | `/coupon` | 🔒 | List coupons |
| POST | `/coupon` | 🔒 | Create: `{ name, amount (1–100 %), expire }` |
| PUT | `/coupon/:couponId` | 🔒 | Update |

### Orders: `/order`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 👤 | My orders, newest first (`page`, `size`, optional `status`) |
| GET | `/all` | 🔒 | Every order, newest first, with the customer's `userName` and `email` (`page`, `size`, optional `status`) |
| POST | `/` | 👤 | Create an order from the cart (see below) |
| PATCH | `/:orderId/cancel` | 👤 | Cancel my order: `{ reason }` |
| PATCH | `/:orderId/delivered` | 🔒 | Mark as delivered |
| POST | `/webhook` | Stripe | Stripe webhook (signature-verified, raw body) |

### Notifications: `/notification`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 👤 | My notifications, newest first, with `unreadCount`. `?unread=true` for unread only; supports `page` and `size` |
| PATCH | `/:notificationId/read` | 👤 | Mark one as read |
| PATCH | `/read-all` | 👤 | Mark all as read |

A notification looks like `{ type, title, message, data: { orderId }, readAt, createdAt }`. Types are `order.created` (to the customer) and `order.received` (to admins).

### Reviews: `/product/:productId/review`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 🌐 | The product's reviews, newest first, with the reviewer's `userName` (`page`, `size`) |
| POST | `/` | 👤 | Review a delivered product: `{ comment, rating (1–5) }`; returns the `review` (with its `_id`) |
| PATCH | `/:reviewId` | 👤 | Update my review: `{ comment?, rating? }`; returns the updated `review` |

### Listing query parameters

`GET /product` supports:

| Param | Example | Effect |
| --- | --- | --- |
| `page`, `size` | `?page=2&size=20` | Pagination (size 1–100, default 10). On `/product`, a **number** in `size` is the page size and anything else (`s`, `m`, `lg`, `xl`) filters by product size |
| `search` | `?search=shirt` | Case-insensitive match on name or description |
| `sort` | `?sort=-finalPrice,name` | Sort; `-` for descending |
| `fields` | `?fields=name,finalPrice` | Return only these fields |
| filters | `?brandId=...&finalPrice[gte]=100&finalPrice[lte]=500&size=m` | `categoryId`, `subcategoryId`, `brandId`, `slug`, `size`, `colors` (exact; repeat a param to match any), `price`, `finalPrice`, `discount`, `stock` (exact or `gt`/`gte`/`lt`/`lte`) |

Only these fields can be filtered, sorted (`name`, `price`, `finalPrice`, `discount`, `stock`, `createdAt`) or selected; anything else in the query string is ignored. Deleted products are never listed.

Other list endpoints support `page` and `size`. Every paginated response includes:

```json
{ "pagination": { "page": 1, "size": 10, "total": 42, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false } }
```

## Order and payment flow

```
Cart ──POST /order──► validate coupon + price items
                         │
                         ▼
        ┌──────── one MongoDB transaction ────────┐
        │ reserve stock (only if enough is left)  │
        │ create order                            │
        │ record coupon use (once per customer)   │
        │ remove ordered items from cart          │
        │ notify the customer and admins          │
        └─────────────────────────────────────────┘
                         │
          cash ──────────┴────────── card
           │                          │
     status: placed          status: waitPayment
                             Stripe Checkout session → client redirects to session.url
                             (paid → FE_URL/#/order; abandoned → FE_URL/#/orders?checkout=cancelled)
                                      │
                         webhook: checkout.session.completed → placed
                         webhook: checkout.session.expired   → rejected + stock & coupon returned
                         (sessions expire after 31 minutes)
```

Order statuses: `waitPayment` → `placed` → `onWay` → `delivered`, or `canceled` / `rejected`.

- **Cancel**: a cash order can be cancelled while `placed`, and a card order while `waitPayment`. Cancelling returns the stock and coupon. For a card order the Stripe session is expired first, so the customer can no longer pay; if they already paid, the cancel is refused with `409`.
- **Late payments**: if a payment still arrives for a canceled or rejected order, it is refunded automatically.
- **Stuck orders**: a sweep (every 5 minutes in the server process) rejects card orders still unpaid 15 minutes after their session expired, and returns their stock and coupon. This covers a crash before the Stripe session was created, or a lost webhook.
- **Oversell protection**: stock is decremented with a conditional update, so two simultaneous orders cannot take the last item twice.
- **Idempotency**: send a unique `Idempotency-Key` header (for example a UUID) with `POST /order`, and reuse it when retrying. A retry with the same key returns the original order and payment link with status `200` and the header `Idempotent-Replayed: true`. Stripe calls are also keyed by order ID, so a retry never creates a second checkout session.
- **Webhooks are idempotent**: they only change orders still in `waitPayment`, so a repeated event is a no-op.

In Stripe, point the webhook at `POST /order/webhook` (in the production stack: `https://<your-domain>/api/order/webhook`) and subscribe to `checkout.session.completed` and `checkout.session.expired`. In development, forward events with the Stripe CLI: `stripe listen --forward-to localhost:5000/order/webhook`.

## Conventions

### Error format

Every error has the same shape:

```json
{ "message": "Validation Error", "errors": [{ "field": "email", "message": "Email is required" }], "requestId": "3f2c..." }
```

`errors` appears only for validation failures. `requestId` matches the `X-Request-Id` response header and the server log line. Unexpected errors return `500` with a generic message (the details are only in the server log). With `MOOD=DEV`, the response also includes the error detail and stack trace.

| Status | Meaning |
| --- | --- |
| 400 | Invalid input or a business rule failed |
| 401 | Missing, invalid or expired token |
| 403 | Logged in but not allowed (wrong role) |
| 404 | Resource or route not found |
| 409 | Conflict (duplicate value, concurrent change, entity still in use) |
| 413 | Uploaded file too large (5 MB per image) |
| 429 | Rate limit exceeded |
| 502 | Payment provider failed |

### Adding a new module

1. Create `src/modules/<name>/` with a router, controller, service and validation file.
2. Extend `BaseRouter`, `BaseController` and `BaseService`.
3. Have the service depend on other **services** or **interfaces**, not on other modules' models (read-only existence checks are the exception).
4. Wire it up and mount its route in [src/container.ts](src/container.ts).
