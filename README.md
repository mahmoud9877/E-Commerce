# E-Commerce API

A REST API for an online store, built with **Express**, **TypeScript** and **MongoDB**. It covers the full shopping flow: accounts and email verification, a catalog (categories, subcategories, brands, products), cart, coupons, orders with cash or Stripe card payment, wishlist and reviews.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Order and payment flow](#order-and-payment-flow)
- [Conventions](#conventions)
- [CI/CD](#cicd)

---

## Features

- **Accounts**: sign up, email confirmation (with resend), login, password reset by emailed code.
- **Roles**: `User` (customer) and `Admin`. Catalog management and delivery updates are admin-only.
- **Catalog**: categories → subcategories → products, plus brands. Images are stored on Cloudinary.
- **Product listing**: filtering, full-text-style search, sorting, field selection and pagination.
- **Cart**: add, update quantity, remove items, clear.
- **Coupons**: percentage discounts with an expiry date.
- **Orders**: cash on delivery or card through Stripe Checkout. Stock, coupon usage and the cart are updated in a single MongoDB transaction.
- **Safe retries**: order creation accepts an `Idempotency-Key` header, so a double click or network retry never creates a second order.
- **Stripe webhooks**: paid sessions place the order; expired sessions reject it and return the stock.
- **Wishlist and reviews**: a user can review a product only after it was delivered to them, once per product.

## Tech stack

| Area | Choice |
| --- | --- |
| Runtime | Node.js 20, ES modules |
| Language | TypeScript (strict) |
| Web framework | Express 4 |
| Database | MongoDB with Mongoose 6 (replica set required) |
| Validation | Joi |
| Auth | JWT (`jsonwebtoken`), passwords hashed with `bcryptjs` |
| Payments | Stripe Checkout + webhooks |
| File uploads | Multer → Cloudinary |
| Email | Nodemailer (Gmail) |
| Packaging | Docker, Docker Compose |
| CI/CD | GitHub Actions → GitHub Container Registry |

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
   ├──► other services (never another module's model)
   ├──► infrastructure via interfaces: IMailer, IImageStorage, IPaymentGateway, ...
   ▼
Mongoose model                                                       (DB/model)
```

Key ideas:

- **Composition root**: [src/container.ts](src/container.ts) is the only place that creates objects and wires them together. Every class receives its dependencies through its constructor, so any of them can be replaced by a fake in tests.
- **Dependency inversion**: services depend on interfaces in [src/core/contracts.ts](src/core/contracts.ts), not on Stripe, Cloudinary or Nodemailer directly. The concrete implementations live in [src/services](src/services). Stripe types never leave `PaymentService`.
- **One owner per collection**: a service writes only its own collection. For example, `OrderService` reserves stock through `ProductService.reserveStock()` and marks a coupon used through `CouponService.setUsage()`.
- **Base classes** in [src/core](src/core):
  - `BaseRouter`: builds the Express router and provides the `authenticated()` and `adminOnly()` guards.
  - `BaseController`: binds handlers and forwards async errors to the error handler.
  - `BaseService`: `findOrFail`, `paginate`, `transaction` and other shared helpers.
- **Errors**: services throw `AppError(message, status)`, and one global handler turns every error into the same JSON shape.

## Project structure

```
.
├── index.ts                  # entry point: env check, start, graceful shutdown
├── DB/
│   ├── connection.ts         # MongoDB connection
│   └── model/                # Mongoose schemas
├── src/
│   ├── app.ts                # Express app: middleware, routes, error handler
│   ├── container.ts          # composition root (dependency wiring)
│   ├── loadEnv.ts            # loads config/.env
│   ├── core/                 # base classes, AppError, Env, interfaces
│   ├── middleware/           # auth guard, Joi validator
│   ├── services/             # Stripe, Cloudinary, email, JWT, hashing, uploads
│   ├── modules/              # one folder per feature
│   │   ├── auth/  brand/  cart/  category/  coupon/
│   │   ├── order/  product/  reviews/  subcategory/  user/
│   ├── types/                # shared types
│   └── utils/                # pagination, query features, slug
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

Each module follows the same pattern: `x.router.ts`, `x.controller.ts`, `x.service.ts`, `x.validation.ts`.

## Getting started

### Prerequisites

- Node.js 20
- MongoDB **running as a replica set** (order creation uses transactions). MongoDB Atlas already is one. Locally, the Docker setup below provides one.
- Accounts for Cloudinary, Stripe and a Gmail app password, if you want uploads, payments and email to work.

### Option 1: Docker (recommended)

```bash
cp .env.example config/.env      # then fill in real values
docker compose up --build
```

The API runs on `http://localhost:5000`, and MongoDB runs as a single-node replica set on `localhost:27017`. To open the database from your machine (for example with Compass), use `mongodb://localhost:27017/ecommerce?directConnection=true`.

### Option 2: Node directly

```bash
npm ci
cp .env.example config/.env      # point DB_LOCAL at a replica set
npm run dev                      # hot reload with tsx
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with hot reload (tsx) |
| `npm run typecheck` | Type-check without emitting |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled app |

## Configuration

All configuration comes from environment variables, loaded from `config/.env`. [.env.example](.env.example) lists every variable with a placeholder. The app checks the required ones at startup and refuses to start if any are missing.

| Variable | Purpose |
| --- | --- |
| `DB_LOCAL` | MongoDB connection string (replica set) |
| `PORT` | HTTP port (default `5000`) |
| `MOOD` | `DEV` adds stack traces to error responses |
| `BEARER_KEY` | Prefix expected in the `Authorization` header |
| `TOKEN_SIGNATURE` | JWT signing secret for login tokens |
| `EMAIL_TOKEN` | JWT signing secret for email-confirmation links |
| `SALT_ROUND` | bcrypt cost factor |
| `gmail`, `gmailPass` | Sender account for Nodemailer |
| `API_KEY`, `API_SECRET`, `CLOUD_NAME` | Cloudinary credentials |
| `Secret_Key`, `endpointSecret` | Stripe secret key and webhook signing secret |
| `FE_URL` | Frontend URL used in redirects and Stripe success URL |

Never commit `config/.env`; it is ignored by git and excluded from the Docker image.

## API reference

**Auth header**: protected routes expect `Authorization: <BEARER_KEY><token>`. With `BEARER_KEY=Bearer__`, that is `Authorization: Bearer__eyJhbGci...`.

**Access**: 🌐 public · 👤 any logged-in user · 🔒 admin only

### Auth: `/auth`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/signup` | 🌐 | Create an account and send a confirmation email |
| GET | `/confirmEmail/:token` | 🌐 | Confirm the email (link from the email) |
| GET | `/NewConfirmEmail/:token` | 🌐 | Resend the confirmation email |
| POST | `/login` | 🌐 | Returns a JWT and basic user info |
| PATCH | `/sendCode` | 🌐 | Email a password-reset code |
| PATCH | `/forgetPassword` | 🌐 | Reset the password using the code |
| GET | `/` | 🌐 | List users (paginated) |

### Catalog

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/category` | 🌐 | List categories |
| POST | `/category` | 🔒 | Create (multipart, `image` field) |
| PUT | `/category/:categoryId` | 🔒 | Update |
| DELETE | `/category` | 🔒 | Delete (`categoryId` in body) |
| GET | `/subcategory` or `/category/:categoryId/subcategory` | 🌐 | List subcategories |
| POST | `/category/:categoryId/subcategory` | 🔒 | Create |
| PUT | `/category/:categoryId/subcategory/:subcategoryId` | 🔒 | Update |
| GET | `/brand` | 🌐 | List brands |
| POST | `/brand` | 🔒 | Create (multipart, `image` field) |
| PUT | `/brand/:brandId` | 🔒 | Update |
| DELETE | `/brand` | 🔒 | Delete |
| GET | `/product` | 🌐 | List, filter, search, sort, paginate |
| POST | `/product` | 🔒 | Create (multipart: `mainImage` ×1, `subImages` ≤5) |
| PUT | `/product/:productId` | 🔒 | Update |

### Shopping

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/cart` | 👤 | Get my cart |
| POST | `/cart` | 👤 | Add a product or set its quantity: `{ productId, quantity }` |
| PATCH | `/cart/:productId/remove` | 👤 | Remove a product |
| DELETE | `/cart/deleteCart` | 👤 | Empty the cart |
| PATCH | `/product/:productId/wishlist/add` | 👤 | Add to wishlist |
| PATCH | `/product/:productId/wishlist/remove` | 👤 | Remove from wishlist |
| GET | `/coupon` | 🌐 | List coupons |
| POST | `/coupon` | 🔒 | Create: `{ name, amount (1–100 %), expire }` |
| PUT | `/coupon/:couponId` | 🔒 | Update |

### Orders: `/order`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | 👤 | Create an order from the cart (see below) |
| PATCH | `/:orderId/cancel` | 👤 | Cancel my order: `{ reason }` |
| PATCH | `/:orderId/delivered` | 🔒 | Mark as delivered |
| POST | `/webhook` | Stripe | Stripe webhook (signature-verified, raw body) |

### Reviews: `/product/:productId/review`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | 👤 | Review a delivered product: `{ comment, rating (1–5) }` |
| PATCH | `/` | 👤 | Update my review: `{ reviewId, comment?, rating? }` |

### Listing query parameters

`GET /product` supports:

| Param | Example | Effect |
| --- | --- | --- |
| `page`, `size` | `?page=2&size=20` | Pagination (size 1–100, default 10) |
| `search` | `?search=shirt` | Case-insensitive match on name or description |
| `sort` | `?sort=-finalPrice,name` | Sort; `-` for descending |
| `fields` | `?fields=name,finalPrice` | Return only these fields |
| any field | `?finalPrice[gte]=100&finalPrice[lte]=500` | Filter; supports `gt`, `gte`, `lt`, `lte` |

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
        │ mark coupon used                        │
        │ remove ordered items from cart          │
        └─────────────────────────────────────────┘
                         │
          cash ──────────┴────────── card
           │                          │
     status: placed          status: waitPayment
                             Stripe Checkout session → client redirects to session.url
                                      │
                         webhook: checkout.session.completed → placed
                         webhook: checkout.session.expired   → rejected + stock & coupon returned
```

Order statuses: `waitPayment` → `placed` → `onWay` → `delivered`, or `canceled` / `rejected`.

- **Cancel**: a cash order can be cancelled while `placed`, and a card order while `waitPayment`. Cancelling returns the stock and coupon.
- **Oversell protection**: stock is decremented with a conditional update, so two simultaneous orders cannot take the last item twice.
- **Idempotency**: send a unique `Idempotency-Key` header (for example a UUID) with `POST /order`, and reuse it when retrying. A retry with the same key returns the original order and payment link with status `200` and the header `Idempotent-Replayed: true`. Stripe calls are also keyed by order ID, so a retry never creates a second checkout session.
- **Webhooks are idempotent**: they only change orders still in `waitPayment`, so a repeated event is a no-op.

In Stripe, point the webhook at `POST /order/webhook` and subscribe to `checkout.session.completed` and `checkout.session.expired`.

## Conventions

### Error format

Every error has the same shape:

```json
{ "message": "Validation Error", "errors": [{ "field": "email", "message": "Email is required" }] }
```

`errors` appears only for validation failures. With `MOOD=DEV`, the response also includes the stack trace.

| Status | Meaning |
| --- | --- |
| 400 | Invalid input or a business rule failed |
| 401 | Missing, invalid or expired token |
| 403 | Logged in but not allowed (wrong role) |
| 404 | Resource or route not found |
| 409 | Conflict (duplicate name, concurrent change) |
| 502 | Payment provider failed |

### Adding a new module

1. Create `src/modules/<name>/` with a router, controller, service and validation file.
2. Extend `BaseRouter`, `BaseController` and `BaseService`.
3. Have the service depend on other **services** or **interfaces**, not on other modules' models.
4. Wire it up and mount its route in [src/container.ts](src/container.ts).

## CI/CD

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push and pull request to `main`:

1. **Check**: install, type-check, build, and a report-only `npm audit`.
2. **Docker smoke test**: build the image, start it with MongoDB through Docker Compose, and check that `/` returns 200, an unknown route returns 404, and a protected route without a token returns 401.
3. **Publish** (push to `main` only): push the image to `ghcr.io/<owner>/<repo>`, tagged with the commit SHA and `latest`.

The Docker image is a multi-stage build that runs as a non-root user, includes a healthcheck, and shuts down cleanly on `SIGTERM`.
