# DevBoard — Dockerfile & docker-compose.yml Explained

## Overview

When you run `docker-compose up --build`, two files do all the work:

- **`Dockerfile`** — recipes for building your NestJS app into an image
- **`docker-compose.yml`** — wires three containers (PostgreSQL, NestJS API, Nginx) into a full running stack

---

## Dockerfile

Your Dockerfile uses a **multi-stage build** — an industry-standard pattern that keeps your final image lean and production-ready.

### Why multi-stage?

A naive Dockerfile copies everything in and runs your app. That means the final image contains TypeScript, all devDependencies, source files, and the compiler — hundreds of extra megabytes that serve no purpose at runtime.

Multi-stage solves this by using two separate stages:

| Stage | Purpose | What it contains |
|---|---|---|
| `builder` | Compile TypeScript | Everything — source, devDependencies, compiler |
| `runner` | Run the app | Only compiled output + production dependencies |

The final image shipped to your server is the `runner` stage only.

---

### Stage 1 — Builder

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
```

**Line by line:**

- `FROM node:20-alpine AS builder` — starts from the official Node.js 20 image (Alpine = minimal Linux, ~5MB base). Labels this stage `builder`.
- `WORKDIR /app` — all subsequent commands run from `/app` inside the container.
- `COPY package*.json ./` — copies only `package.json` and `package-lock.json` first, before the source code.
- `RUN npm ci` — installs all dependencies (including devDependencies like TypeScript).
- `COPY . .` — now copies the full source code.
- `RUN npm run build` — compiles TypeScript → `dist/`.

> **Why copy `package*.json` before the rest of the source?**
> Docker builds in layers and caches each one. If you copy everything at once, any source file change invalidates the npm install layer and reinstalls all dependencies from scratch. Copying package files first means `npm ci` only re-runs when your dependencies actually change — a significant speed improvement.

---

### Stage 2 — Runner

```dockerfile
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN npx prisma@5 generate

EXPOSE 3000

COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
```

**Line by line:**

- `FROM node:20-alpine AS runner` — starts fresh from the base image. Nothing from the builder stage carries over automatically.
- `npm ci --only=production` — installs only production dependencies. No TypeScript compiler, no Jest, no dev tools.
- `COPY --from=builder /app/dist ./dist` — pulls the compiled output from the builder stage. This is the key multi-stage instruction.
- `COPY --from=builder /app/prisma ./prisma` — copies your schema so migrations can run on startup.
- `npx prisma@5 generate` — generates the Prisma client inside this image. Version is pinned to `@5` to avoid npx grabbing the latest (v7), which has breaking changes with our schema.
- `EXPOSE 3000` — documents that this container listens on port 3000. Does not actually publish the port (that's docker-compose's job).
- `CMD ["./docker-entrypoint.sh"]` — the command that runs when the container starts.

---

### docker-entrypoint.sh

```bash
#!/bin/sh
echo "Waiting for PostgreSQL to be ready..."

until npx prisma@5 migrate deploy; do
  echo "Migration failed - PostgreSQL not ready yet. Retrying in 2s..."
  sleep 2
done

echo "Migrations complete. Starting server..."
exec node dist/main
```

**Why this exists:**

`depends_on` in docker-compose only waits for the PostgreSQL *container* to start — not for PostgreSQL to be *ready to accept connections*. Without this script, NestJS tries to connect before the database is initialized and crashes.

This script loops on `migrate deploy` until it succeeds (meaning PostgreSQL is ready), then starts the server.

**`migrate deploy` vs `migrate dev`:**

| Command | Use case |
|---|---|
| `prisma migrate dev` | Local development — creates migration files, prompts you |
| `prisma migrate deploy` | Production/containers — applies existing migrations silently |

---

## docker-compose.yml

docker-compose defines your entire stack in one file. Instead of running three `docker run` commands with long flags, you get `docker-compose up`.

### The full picture

```
You (browser/curl)
      ↓ port 80
   [ Nginx ]          ← only container exposed to outside
      ↓ http://api:3000
   [ NestJS API ]     ← only reachable inside devboard-network
      ↓ postgres:5432
   [ PostgreSQL ]     ← only reachable inside devboard-network
```

---

### Service: postgres

```yaml
postgres:
  image: postgres:16-alpine
  container_name: devboard-postgres
  restart: unless-stopped
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: devboard
  volumes:
    - postgres_data:/var/lib/postgresql/data
  networks:
    - devboard-network
```

- `image: postgres:16-alpine` — uses the official pre-built image. No Dockerfile needed.
- `restart: unless-stopped` — Docker automatically restarts this container if it crashes. This is what replaces PM2 in a containerized setup.
- `environment` — sets up the database user, password, and database name on first boot.
- `volumes: postgres_data` — **critical**. Persists your database data to a named Docker volume. Without this, every `docker-compose down` wipes your entire database.
- No `ports` exposed — PostgreSQL is intentionally not reachable from your machine or the internet. Only containers on `devboard-network` can connect to it.

---

### Service: api

```yaml
api:
  build: .
  container_name: devboard-api
  restart: unless-stopped
  environment:
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/devboard
  depends_on:
    - postgres
  networks:
    - devboard-network
```

- `build: .` — builds the image using the `Dockerfile` in the current directory.
- `DATABASE_URL` — notice the hostname is `postgres`, not `localhost`. Docker's internal DNS resolves service names to container IPs automatically.
- `depends_on: postgres` — starts the postgres container before this one. Combined with `docker-entrypoint.sh`, this ensures migrations only run when the database is actually ready.
- No `ports` — like postgres, the API container is not directly exposed to the outside world. All traffic comes through Nginx.

---

### Service: nginx

```yaml
nginx:
  image: nginx:alpine
  container_name: devboard-nginx
  restart: unless-stopped
  ports:
    - "80:80"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  depends_on:
    - api
  networks:
    - devboard-network
```

- `ports: "80:80"` — the only container that publishes a port to your host machine. Format is `host:container`.
- `volumes: ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro` — mounts your local config file into the container as read-only (`:ro`). No need to rebuild the image when you change Nginx config — just restart the container.
- `depends_on: api` — starts after the api container.

---

### Network

```yaml
networks:
  devboard-network:
    driver: bridge
```

A private bridge network. All three containers join it, so they can talk to each other by service name (`postgres`, `api`, `nginx`). Nothing outside the network can reach them directly — except through Nginx on port 80.

This is the same security model used in production cloud environments (VPCs, private subnets).

---

### Named Volume

```yaml
volumes:
  postgres_data:
```

Declares the named volume used by the postgres service. Docker manages where this data lives on disk. It survives `docker-compose down` and only gets deleted if you explicitly run `docker-compose down -v`.

---

## Quick Reference

| Command | What it does |
|---|---|
| `docker-compose up --build` | Build images and start all containers |
| `docker-compose up -d` | Start in detached (background) mode |
| `docker-compose down` | Stop and remove containers (data persists) |
| `docker-compose down -v` | Stop, remove containers AND delete volumes (data gone) |
| `docker-compose logs -f api` | Follow logs from the api container |
| `docker-compose ps` | Show running containers and their status |
| `docker-compose exec api sh` | Open a shell inside the api container |

---

## The Security Model at a Glance

| Container | Reachable from outside? | Reachable from other containers? |
|---|---|---|
| postgres | ❌ No | ✅ Yes (via `postgres:5432`) |
| api | ❌ No | ✅ Yes (via `api:3000`) |
| nginx | ✅ Yes (port 80) | ✅ Yes |

This is intentional — you expose the minimum surface area to the outside world. Only Nginx faces the internet. Everything else is internal.