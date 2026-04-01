#!/bin/sh
echo "Waiting for PostgreSQL to be ready..."

until npx prisma@5 migrate deploy; do
  echo "Migration failed - PostgreSQL not ready yet. Retrying in 2s..."
  sleep 2
done

echo "Migrations complete. Starting server..."
exec node dist/main