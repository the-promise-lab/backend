# Multi-stage build for NestJS application
FROM node:22-alpine AS builder

# Install OpenSSL for Prisma
RUN apk update && apk add --no-cache openssl

# Create app directory
WORKDIR /app

# Install specific npm version
RUN npm install -g npm@10.9.3

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .
# Set DATABASE_URL as an argument and environment variable                                                                                         │
ARG DATABASE_URL                                                                                                                                   │
ENV DATABASE_URL=${DATABASE_URL}   

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install OpenSSL for Prisma and curl for health check
RUN apk add --no-cache openssl curl

# Create app directory
WORKDIR /app

# Install specific npm version
RUN npm install -g npm@10.9.3

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
