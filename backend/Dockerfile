FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files (for prisma CLI)
COPY package.json package-lock.json ./

# Copy prisma schema
COPY prisma/ ./prisma/

# Copy shared types
COPY shared/ ./shared/

# Copy backend package files
COPY backend/package.json backend/package-lock.json ./backend/

# Install root deps (prisma CLI) and backend deps
RUN npm ci && cd backend && npm ci

# Copy backend source
COPY backend/ ./backend/

# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build backend
RUN cd backend && npm run build

# --- Production stage ---
FROM node:20-alpine

WORKDIR /app

# Copy root package files and install production deps only (for prisma runtime)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy backend package files and install production deps only
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy prisma schema (needed for migrate deploy)
COPY prisma/ ./prisma/

# Copy generated Prisma client from builder
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma ./backend/node_modules/@prisma

# Copy built backend
COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 8000

# Run migrations then start the server
CMD npx prisma migrate deploy --schema=prisma/schema.prisma && node backend/dist/index.js
