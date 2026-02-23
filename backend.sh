#!/usr/bin/env bash
set -e

echo "Starting Docker services..."
docker compose up -d

echo "Installing backend dependencies..."
cd backend && npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Starting backend..."
npm run dev
