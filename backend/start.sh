#!/bin/sh
set -e

echo "Running database migrations..."

# Try migrate deploy first (normal path for subsequent deploys)
if npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1; then
  echo "Migrations applied successfully."
else
  echo "Migration deploy failed. Resetting database and retrying..."
  # Reset drops all tables/types and re-runs all migrations from scratch
  # Safe for new databases; --force skips confirmation, --skip-seed skips seed
  npx prisma migrate reset --force --skip-seed --schema=prisma/schema.prisma
  echo "Database reset and migrations applied."
fi

echo "Starting server..."
exec node backend/dist/index.js
