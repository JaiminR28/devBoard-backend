# DevBoard Backend

A NestJS REST API for managing developer log entries — built as a hands-on reference project for deploying a production-ready NestJS application on AWS EC2 using Docker.

> This project accompanies a tutorial on containerizing and deploying a NestJS + PostgreSQL app with Docker Compose and Nginx on EC2.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | NestJS 11 |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Reverse Proxy | Nginx |
| Containerization | Docker + Docker Compose |

---

## Architecture

```
Internet
   │
   ▼
[ Nginx :80 ]          ← reverse proxy
   │
   ▼
[ NestJS API :3000 ]   ← application server (internal)
   │
   ▼
[ PostgreSQL :5432 ]   ← database (internal)
```

All three services run as Docker containers on a shared bridge network (`devboard-network`). Only Nginx is exposed to the outside world on port 80.

---

## API

Base URL: `http://<your-host>/logs`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/logs` | Get all log entries (newest first) |
| GET | `/logs/:id` | Get a single log entry |
| POST | `/logs` | Create a new log entry |
| PATCH | `/logs/:id` | Update a log entry |
| DELETE | `/logs/:id` | Delete a log entry |

### Log Entry Schema

```json
{
  "id": 1,
  "title": "string",
  "content": "string",
  "tags": ["string"],
  "createdAt": "2026-03-28T13:20:32.000Z",
  "updatedAt": "2026-03-28T13:20:32.000Z"
}
```

---

## Running Locally with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed

### Steps

```bash
git clone <your-repo-url>
cd devboard-backend

# Build and start all services
docker compose up --build
```

The API will be available at `http://localhost`.

To stop:

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

---

## Running Locally without Docker

### Prerequisites

- Node.js 22+
- A running PostgreSQL instance

### Steps

```bash
git clone <your-repo-url>
cd devboard-backend
npm install
cp .env.example .env
```

Update `.env`:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<dbname>
PORT=3000
```

Run migrations and start:

```bash
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/devboard` |
| `PORT` | Port the NestJS server listens on (optional, defaults to 3000) | `3000` |

> When using Docker Compose, `DATABASE_URL` is set automatically in `docker-compose.yml`.

---

## Project Structure

```
devboard-backend/
├── src/
│   ├── logs/              # Log entry module (controller, service, tests)
│   ├── prisma/            # Prisma service (shared module)
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/
├── nginx/
│   └── nginx.conf         # Reverse proxy config
├── Dockerfile             # Multi-stage build
├── docker-compose.yml     # Full stack orchestration
├── docker-entrypoint.sh   # Waits for DB, runs migrations, starts server
└── .env.example
```

---

## Docker Details

### Multi-Stage Dockerfile

The Dockerfile uses a two-stage build:

1. **Builder** — installs all dependencies and compiles TypeScript to `dist/`
2. **Runner** — installs production dependencies only, copies the compiled output, generates the Prisma client, and runs the entrypoint script

This keeps the final image lean by excluding dev dependencies and source files.

### Entrypoint Script

`docker-entrypoint.sh` handles startup sequencing:

1. Polls PostgreSQL until it's ready to accept connections
2. Runs `prisma migrate deploy` to apply any pending migrations
3. Starts the server with `node dist/main`

This ensures the API never starts before the database is ready.

---

## Scripts

```bash
npm run start:dev     # development (watch mode)
npm run build         # compile TypeScript
npm run start:prod    # run compiled output
npm run test          # unit tests
npm run test:cov      # test coverage
npm run test:e2e      # end-to-end tests
npm run lint          # lint and auto-fix
npm run format        # format with Prettier
```

---

## Git Workflow

- `main` → stable branch (protected)
- `feature/*` → development branches
- All changes via Pull Requests
- Commit conventions: `feat:`, `fix:`, `chore:`, `refactor:`

---

## Deployment (EC2 + Docker)

A full step-by-step tutorial covering how to deploy this project on an AWS EC2 instance is coming soon as a LinkedIn article. It will cover:

- Provisioning an EC2 instance and configuring security groups
- Installing Docker and Docker Compose on Ubuntu
- Cloning the repo and setting environment variables
- Running the full stack with `docker compose up -d`
- Accessing the API through Nginx on port 80

---

## Author

**Jaimin R.** — [GitHub](https://github.com/JaiminR28)
