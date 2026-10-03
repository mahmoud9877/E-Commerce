# E-Commerce frontend

**React 19 + Vite 7 + TypeScript** storefront and admin dashboard for the [backend API](../backend/README.md). It covers every backend feature.

> To run the whole application, see the [repository README](../README.md).

## Features

| Area | Pages (`#/...`) | Backend endpoints |
| --- | --- | --- |
| Shop | `/` search, category → subcategory, brand, price range, size, sort, pagination (all kept in the URL) | `GET /product`, `/category`, `/subcategory`, `/brand` |
| Product | `/product/:id` gallery, sizes, colors, stock, quantity, add to cart, wishlist, reviews (list, write, edit your own) | `GET /product/:id`, `/product/:id/review` |
| Account | `/signup`, `/login` (refresh tokens handled automatically), `/forgot` (emailed 6-digit code), `/account` | `/auth/*` |
| Cart | `/cart` change quantity, remove, clear; flags items that are out of stock or deleted | `/cart` |
| Checkout | `/checkout` address, 1–3 phone numbers, coupon, note, cash or card (Stripe redirect); retry-safe through an `Idempotency-Key` | `POST /order` |
| Orders | `/orders` status filter, cancel with reason, "Pay now" for unpaid card orders | `GET /order`, `PATCH /order/:id/cancel` |
| Wishlist | `/wishlist` | `GET /product/wishlist`, wishlist add/remove |
| Notifications | `/notifications` unread filter, mark one or all as read; unread count in the header (polled every minute) | `/notification` |
| Admin | `/admin/orders` (all orders, mark delivered), `/admin/products` (create/edit with images), `/admin/categories` (+ subcategories), `/admin/brands`, `/admin/coupons`, `/admin/users` | admin-only endpoints |
| Stripe / email returns | `/order` (payment received), `/invalidEmail` | redirects from the backend |

The login response has no role, so the app learns whether the user is an admin by calling the admin-only `GET /auth` once (200 = admin, 403 = customer). The admin pages are hidden from customers, and the backend enforces the role on every call anyway.

## How it reaches the API

The browser only talks to the frontend's own origin. Every API call goes to **`/api/...`**, which is forwarded to the backend with the `/api` prefix removed:

| Mode | Who forwards `/api` | Target |
| --- | --- | --- |
| Development (`npm run dev`, Docker `development` target) | Vite dev server proxy ([vite.config.ts](vite.config.ts)) | `API_PROXY_TARGET` (Docker: `http://backend:5000`; host default: `http://localhost:5000`) |
| Production (Docker `production` target) | nginx ([nginx/default.conf.template](nginx/default.conf.template)) | `BACKEND_URL` (default `http://backend:5000`) |

So there is no CORS in the normal flow, and Docker-internal host names never reach browser code.

Routing uses the URL hash (`#/login`, `#/order`...) because the backend redirects to `FE_URL/#/order`, `FE_URL/#/orders` and `FE_URL/#/invalidEmail`.

## Code layout

```
src/
├── api.ts            # fetch wrapper: JSON or multipart, auth header, token refresh, session storage
├── endpoints.ts      # one typed function per backend endpoint
├── types.ts          # response shapes
├── App.tsx           # header (cart / unread counters), routes, login and admin guards
├── lib/              # hash router, useAsync, session/event hooks, wishlist hook
├── components/       # ProductCard, OrderCard, shared UI (errors incl. per-field validation, pager)
└── pages/            # customer pages; pages/admin/ for the dashboard
```

## Configuration

`VITE_*` variables are compiled into the bundle at build time (Docker build args). They are public: never put secrets in them.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | API base as seen by the browser; change only if the API lives on another browser-reachable origin |
| `VITE_BEARER_KEY` | `Bearer__` | Must equal the backend's `BEARER_KEY` (Docker passes it through automatically) |

Dev-server-only settings (not in the bundle): `API_PROXY_TARGET`, `VITE_DEV_PORT` (default `3000`), `WATCH_POLLING` (`true` to poll for file changes on Windows/WSL bind mounts).

Outside Docker, Vite reads the repository root `.env` (`envDir: ".."`).

## Scripts (Node.js 24)

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR on http://localhost:3000 |
| `npm run typecheck` | Type-check |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
