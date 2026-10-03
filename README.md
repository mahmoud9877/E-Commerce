# E-Commerce

Full-stack online store: a **TypeScript/Express REST API** with **MongoDB**, and a **React (Vite)** frontend. Both apps live in this one repository and run together with Docker Compose.

```
.
├── backend/                 # Express + TypeScript API          → backend/README.md (API reference)
│   ├── src/  tests/  index.ts
│   ├── package.json  package-lock.json  tsconfig.json
│   └── Dockerfile  .dockerignore
├── frontend/                # React + Vite client               → frontend/README.md
│   ├── src/  public/  index.html  nginx/
│   ├── package.json  package-lock.json  vite.config.ts
│   └── Dockerfile  .dockerignore
├── docker-compose.yml       # development stack (hot reload)
├── docker-compose.prod.yml  # production-like stack (compiled backend + nginx)
├── .env.example             # every setting, with safe placeholders
└── .github/workflows/ci.yml
```

Each app has its own `package.json`, dependencies, Dockerfile and build. There is no npm workspace; `backend/` and `frontend/` can each be understood and built on their own.

---

## Quick start

Requirements: **Docker** with **Compose v2.24+** (Docker Desktop, or Docker Engine on Linux/WSL2). Node.js is not needed on your machine.

```bash
git clone <repository-url>
cd <repository>
cp .env.example .env          # then replace the placeholders (see "Configuration")
docker compose build
docker compose up
```

| What | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API through the frontend (what the browser uses) | http://localhost:3000/api (e.g. http://localhost:3000/api/health) |
| Backend, direct (Postman, Stripe CLI, email links in dev) | http://localhost:5000 |
| Backend health | http://localhost:5000/health |
| MongoDB (Compass, mongosh) | `mongodb://localhost:27017/ecommerce?replicaSet=rs0&directConnection=true` |

The API itself is mounted at the root (`/auth`, `/product`, ...); the `/api` prefix exists only on the frontend's origin. Ports can be changed in `.env` (`FRONTEND_PORT`, `BACKEND_PORT`, `MONGO_HOST_PORT`).

The app starts with placeholder secrets, but **sign-up emails, image uploads and payments only work with real Gmail/SMTP, Cloudinary and Stripe credentials** in `.env`.

## Architecture

### Development (`docker-compose.yml`)

```
Browser
   │  http://localhost:3000            (page, JS, and /api/* calls: one origin, no CORS)
   ▼
frontend container ── Vite dev server, HMR
   │  /api/* → http://backend:5000/*    (Vite proxy strips /api; Docker DNS, never seen by the browser)
   ▼
backend container ── tsx watch, published on localhost:5000 for direct access
   │  mongodb://mongo:27017/ecommerce?replicaSet=rs0
   ▼
mongo container ── single-node replica set, named volume mongo_data, published on 127.0.0.1:27017 only
```

### Production (`docker-compose.prod.yml`)

```
Browser ──► frontend container (nginx, non-root, :3000 → 8080)
               ├── /          static build (hash routing)
               └── /api/*  →  backend container (compiled JS, non-root, not published)
                                   └──► mongo (internal network only, not published)
```

In both stacks the browser never needs the Docker service name `backend`: it only talks to the frontend origin, and the frontend's server (Vite or nginx) forwards `/api` inside the Docker network. The backend's CORS allow-list (`CORS_ORIGINS`, default `FE_URL`) only matters for other browser clients calling the API directly.

- **Startup order** is enforced with healthchecks, not just `depends_on`: MongoDB is healthy only once the replica set is initiated and has a writable primary; the backend is healthy once `GET /health` reports a live database connection; the frontend starts after that. If the backend still fails to connect it exits and `restart: unless-stopped` retries it.
- **Transactions**: orders use MongoDB multi-document transactions, which require a replica set. The `mongo` service runs `--replSet rs0` and its healthcheck runs `rs.initiate()` on first boot. The replica-set config is stored in the volume, so later starts reuse it.
- **Networks**: `web` (frontend ↔ backend) and `db` (backend ↔ mongo). The frontend has no route to the database. In production `db` is `internal: true`.
- **Uploads**: multer writes to the container's `/tmp`, the file goes to Cloudinary, and the temp file is deleted when the response finishes. Nothing is stored locally, so no upload volume exists.

## Development workflow

`docker compose up` runs both apps in watch mode. Only the source is bind-mounted (`backend/src`, `backend/tests`, `frontend/src`, `frontend/public` and the root config files). `node_modules` always comes from the image, so Windows and Linux binaries never mix.

- Edit `backend/src/**` and the API restarts within a few seconds (tsx watch).
- Edit `frontend/src/**` and the browser updates in place (Vite HMR).
- File watching uses polling (`WATCH_POLLING=true` in `.env`) because file-change events do not cross Windows/WSL bind mounts. On Linux/macOS, or with the repo inside the WSL filesystem, you can set it to `false`.
- **After changing `package.json`** (adding or removing a dependency), rebuild: `docker compose up --build`.
- Changes to `index.html`, `vite.config.ts`, `tsconfig.json` or `backend/index.ts` are picked up on save in most editors. If one is not, run `docker compose restart frontend` (or `backend`).

### Common commands

```bash
docker compose up                       # start everything (foreground, logs in terminal)
docker compose up -d                    # start in the background
docker compose up --build               # rebuild images first (after dependency changes)
docker compose build --no-cache         # full rebuild from scratch
docker compose ps                       # status + health of each container
docker compose logs -f                  # follow all logs
docker compose logs -f backend          # follow one service (backend | frontend | mongo)
docker compose restart backend          # restart one service
docker compose down                     # stop and remove containers (database is kept)
docker compose down -v                  # ...and DELETE the database volume (fresh start)
```

### Inside the containers

```bash
docker compose exec backend sh                      # shell in the backend container
docker compose exec frontend sh                     # shell in the frontend container
docker compose exec mongo mongosh ecommerce         # MongoDB shell

docker compose exec backend npm test                # backend integration tests
docker compose exec backend npm run typecheck       # backend type-check
docker compose exec frontend npm run typecheck      # frontend type-check
docker compose exec backend npm run migrate         # data/index migration (safe to re-run)
docker compose exec backend npm run job:expire-orders   # one unpaid-order sweep
```

`npm test` starts its own throwaway in-memory MongoDB (it never touches your dev data). The first run downloads a MongoDB binary (about 100 MB), and it needs roughly 1 GB of free memory.

### Database

- **Persistence**: data lives in the named volume `mongo_data` and survives `docker compose down`, image rebuilds and container recreation. Only `docker compose down -v` deletes it.
- **Reset**: `docker compose down -v && docker compose up` gives you an empty database.
- **Migrations**: `docker compose exec backend npm run migrate` brings an existing database's data and indexes up to date. Mongoose also creates missing indexes when the app starts, so a fresh database needs nothing.
- **Seeds**: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run `docker compose exec backend npm run seed:admin`. It creates a confirmed Admin account you can log in with right away. Re-running it is safe: an existing account with that email is promoted to Admin and its password reset to `ADMIN_PASSWORD`. Compose reads `.env` only when a container is created, so after editing it run `docker compose up -d` first.

### Stripe webhooks in development

```bash
stripe listen --forward-to localhost:5000/order/webhook    # then put the printed whsec_... in endpointSecret
```

### Running without Docker

Both apps also run directly with **Node.js 24** and read the same root `.env`. Start only the database with `docker compose up -d mongo`, then run `cd backend && npm ci && npm run dev` and `cd frontend && npm ci && npm run dev`. See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

## Configuration

Everything is configured through **one file: `.env` in the repository root**, created from [.env.example](.env.example). It is git-ignored, excluded from every Docker build context, and never copied into an image.

| Section in `.env.example` | Read by | Notes |
| --- | --- | --- |
| Docker Compose (`FRONTEND_PORT`, `BACKEND_PORT`, `MONGO_HOST_PORT`, `MONGO_VERSION`, `MONGO_DB_NAME`, `MONGO_REPLICA_SET`, `NODE_VERSION`, `NGINX_VERSION`, `WATCH_POLLING`, `DOCKER_DB_LOCAL`) | `docker compose` | Host ports and dev tooling |
| Backend (`DB_LOCAL`, `TOKEN_SIGNATURE`, email, Cloudinary, Stripe, `FE_URL`, `CORS_ORIGINS`, ...) | backend container (`env_file`) or `npm run dev` on the host | Full list: [backend/README.md](backend/README.md#configuration). Startup fails fast if a required one is missing |
| Frontend (`VITE_API_BASE_URL`, `VITE_BEARER_KEY`) | Vite, at build time | Compiled into public JavaScript, so never put secrets here. The frontend container gets no backend secrets |

Inside Docker, the compose files set the container-specific values themselves and override `.env`:

| Variable | Development stack | Production stack |
| --- | --- | --- |
| `DB_LOCAL` | `mongodb://mongo:27017/ecommerce?replicaSet=rs0` (or `DOCKER_DB_LOCAL`) | same |
| `MOOD` | `DEV` (stack traces in error responses) | `PROD` |
| `FE_URL` | `http://localhost:${FRONTEND_PORT}` | `FE_URL` from `.env` |
| `API_PUBLIC_URL` (links in emails) | `http://localhost:${BACKEND_PORT}` | `${FE_URL}/api` |
| `TRUST_PROXY` | unset | `1` (exactly one proxy: nginx) |
| `VITE_BEARER_KEY` | from `BEARER_KEY` | from `BEARER_KEY` (build arg) |

## Production build

```bash
docker compose -f docker-compose.prod.yml up -d --build      # http://localhost:3000
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml exec backend node dist/src/scripts/migrate.js
docker compose -f docker-compose.prod.yml down               # add -v to delete its database
```

This stack builds the `production` targets: the backend is compiled with `tsc` and runs `node dist/index.js` with production dependencies only, and the frontend is a static Vite build served by nginx, which also proxies `/api`. Both run as non-root users. Only nginx is published. It is a separate Compose project (`ecommerce-prod`) with its own database volume, so it never touches your development data.

For a real deployment:

- Set real secrets and your public `FE_URL` (e.g. `https://shop.example.com`) in the server's `.env`. Email links then use `https://shop.example.com/api/...`, and Stripe should call `https://shop.example.com/api/order/webhook`.
- Put TLS in front of nginx (a load balancer or reverse proxy). If you add another proxy layer, raise `TRUST_PROXY` to match.
- Prefer a managed, authenticated MongoDB replica set (e.g. Atlas) via `DOCKER_DB_LOCAL`. The bundled `mongo` service has no authentication and is only safe because it sits on an internal network.
- CI publishes both images to GHCR (`ghcr.io/<owner>/<repo>/backend` and `.../frontend`) on every push to `main`.

Building a single image directly: `docker build --target production -t ecommerce-backend ./backend` (or `./frontend`). The frontend accepts `--build-arg VITE_BEARER_KEY=...`.

## CI/CD

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push and pull request to `main`:

1. **Backend**: `npm ci`, type-check, integration tests, build, `npm audit` (production dependencies, high or critical).
2. **Frontend**: `npm ci`, type-check and production build, `npm audit`.
3. **Docker**: validate both compose files, build the development and production images, start the production stack, and smoke-test it through nginx. The test checks that the app loads, that `/api/health` is ok (backend connected to MongoDB), that unknown routes return 404 and protected routes 401, and that the backend and MongoDB are not published.
4. **Publish** (push to `main` only): push both production images to GHCR, tagged with the short commit SHA and `latest`.

## Troubleshooting

- **`env file .env not found`**: run `cp .env.example .env`.
- **`Missing environment variables: ...`** in the backend logs: a required value in `.env` is empty.
- **Port already in use**: change `FRONTEND_PORT` / `BACKEND_PORT` / `MONGO_HOST_PORT` in `.env`. The dev stack derives `FE_URL` from `FRONTEND_PORT` automatically.
- **Hot reload does nothing**: keep `WATCH_POLLING=true` (the default), which is needed when the repo is on a Windows drive.
- **New dependency not found in the container**: `docker compose up --build`.
- **Compass cannot connect**: add `directConnection=true` to the connection string. The replica-set member is named `mongo:27017`, which only resolves inside Docker.
