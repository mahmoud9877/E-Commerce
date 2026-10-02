# syntax=docker/dockerfile:1

# ---- deps: full install (dev deps are needed to compile TypeScript)
FROM node:20.10-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile to dist/, then drop dev deps
FROM deps AS build
COPY tsconfig.json index.ts ./
COPY src ./src
COPY DB ./DB
RUN npm run build && npm prune --omit=dev

# ---- runtime: compiled JS + production deps only, running as non-root
FROM node:20.10-alpine AS runtime
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/index.js"]
