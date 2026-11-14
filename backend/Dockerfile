# ==============================================================================
# FixMyCity Backend — Multi-Stage Production Dockerfile (NestJS / Node 20 Alpine)
# ==============================================================================

# ──────────────────────────────────────────────────────────────────────────────
# Stage 1: Build & Dependencies
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install native compilation dependencies for C++ addons (e.g. bcrypt, node-gyp)
RUN apk add --no-cache python3 make g++

# Copy package manifests first for optimal layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy full application source code
COPY . .

# Compile NestJS TypeScript source to JavaScript dist/
RUN npm run build

# Prune devDependencies to keep only production packages with native addons intact
RUN npm prune --omit=dev && npm cache clean --force

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2: Minimal Production Runtime
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install dumb-init for proper PID 1 signal forwarding and wget for health checks
RUN apk add --no-cache dumb-init wget

# Security: Create dedicated non-root application user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Copy production node_modules from builder stage (pre-compiled native binaries)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy compiled JavaScript distribution artifacts
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 4000

# ALB / Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

# Launch application through dumb-init to ensure proper signal handling
CMD ["dumb-init", "node", "dist/main.js"]
