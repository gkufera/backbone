FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared types source and compile them
COPY shared/ ./shared/
RUN npm install -g typescript && cd shared && tsc --project tsconfig.json

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Install dependencies
RUN cd frontend && npm ci

# Copy frontend source
COPY frontend/ ./frontend/

# Build Next.js app
RUN cd frontend && npm run build

# --- Production stage ---
FROM node:20-alpine

WORKDIR /app

# Copy compiled shared types
COPY --from=builder /app/shared ./shared

# Copy frontend package files and install production deps
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci --omit=dev

# Copy built Next.js app
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public

EXPOSE 3000

WORKDIR /app/frontend
CMD ["npm", "start"]
