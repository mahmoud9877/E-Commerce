# Frontend image. Targets:
#   development  - Vite dev server with HMR, source bind-mounted by docker-compose.yml
#   production   - static build served by nginx (non-root), which also proxies /api to the backend
#                  (default target)
ARG NODE_VERSION=24
ARG NGINX_VERSION=1.28

# ---------------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------------------------
FROM deps AS development
ENV NODE_ENV=development
# Replaced by the bind mount in docker-compose.yml; copied so the image also runs on its own
COPY --chown=node:node . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------------------------
# VITE_* values are compiled into the JavaScript bundle, so they are build arguments, not
# runtime settings. Never put secrets in them: everything in the bundle is public.
FROM deps AS build
ARG VITE_API_BASE_URL=/api
ARG VITE_BEARER_KEY=Bearer__
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_BEARER_KEY=${VITE_BEARER_KEY}
COPY --chown=node:node . .
RUN npm run build

# ---------------------------------------------------------------------------------------------
# nginx-unprivileged runs as uid 101 and listens on 8080 (no root, no privileged port)
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS production
# Rendered into the nginx config at container start by the image's envsubst entrypoint
ENV BACKEND_URL=http://backend:5000 \
    NGINX_RESOLVER=127.0.0.11
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
