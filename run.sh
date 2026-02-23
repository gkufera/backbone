#!/usr/bin/env bash
set -e

echo "Starting Docker services..."
docker compose up -d

echo "Installing frontend dependencies..."
(cd frontend && npm install)

echo "Installing backend dependencies..."
(cd backend && npm install)

echo "Generating Prisma client..."
(cd backend && npx prisma generate)

echo "Starting frontend and backend..."
trap 'kill 0' EXIT
(cd frontend && npm run dev) &
(cd backend && npm run dev) &
wait
