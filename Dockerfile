# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS builder

# this will be our working directory of the docker container
WORKDIR /app 

# Copy package files first — Docker caches this layer
# If you only change src files, npm install won't re-run
COPY package*.json ./

RUN npm ci

# Copy source and compile TypeScript → dist/
COPY . .
RUN npm run build

# ── Stage 2: Run ────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./

# Install production dependencies only — no devDependencies
RUN npm ci --only=production

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Copy prisma schema so we can run migrations on startup
COPY --from=builder /app/prisma ./prisma

# Generate Prisma client inside this image
RUN npx prisma@5 generate


EXPOSE 3000

CMD ["node", "dist/main"]
