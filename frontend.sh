#!/usr/bin/env bash
set -e

echo "Installing frontend dependencies..."
cd frontend && npm install

echo "Starting frontend..."
npm run dev
