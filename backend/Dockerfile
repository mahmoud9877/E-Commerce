# Backend image. Targets:
#   development  - tsx watch with the source bind-mounted by docker-compose.yml (hot reload)
#   production   - compiled JavaScript + production dependencies only, non-root (default target)
#
# Node 24 matches "engines" in package.json and the CI. Override with --build-arg NODE_VERSION=...
ARG NODE_VERSION=24

# ---------------------------------------------------------------------------------------------
# development: Debian (glibc) rather than Alpine so the test suite's in-memory MongoDB
# (mongodb-memory-server downloads an official mongod binary) can run inside the container.
FROM node:${NODE_VERSION}-bookworm-slim AS development
ENV NODE_ENV=development \
    # The mongod binary for tests is fetched on first `npm test`, not during image build
    MONGOMS_DISABLE_POSTINSTALL=1
# The mongod binary used by the tests links against libcurl
RUN apt-get update \
 && apt-get install -y --no-install-recommends libcurl4 ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
# Replaced by the bind mount in docker-compose.yml; copied so the image also runs on its own
COPY --chown=node:node . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------------------------
# build: full install (dev deps are needed to compile TypeScript), compile, then drop dev deps
FROM node:${NODE_VERSION}-alpine AS build
ENV MONGOMS_DISABLE_POSTINSTALL=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json index.ts ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---------------------------------------------------------------------------------------------
# production: compiled JS + production deps only, running as the unprivileged "node" user.
# No .env is ever copied in: configuration comes from the environment at runtime.
FROM node:${NODE_VERSION}-alpine AS production
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 5000
# Uploads are written to the OS temp dir (/tmp, writable by "node") and deleted once each
# request finishes; images are stored on Cloudinary, so no volume is needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
