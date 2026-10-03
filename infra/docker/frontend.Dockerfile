FROM node:22-alpine AS build

WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY docs/checklist-format.md docs/checklist.schema.json /docs/
COPY backend/data/examples/ /backend/data/examples/
RUN npm run build

FROM caddy:2-alpine
COPY infra/docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /web/dist /srv
EXPOSE 80 443
