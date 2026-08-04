# ==========================================
# STAGE 1: Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Generate Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code and build JS
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ==========================================
# STAGE 2: Production Stage
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy Prisma schema and generated Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built application code
COPY --from=builder /app/dist ./dist/

# Expose server port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start command: Wait for DB to sync, then start Express
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
