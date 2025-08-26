# Multi-stage Docker build for Aviation Ape Manager
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.production.json package.json
COPY package-lock.json .

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Copy production vite config
COPY vite.production.config.ts vite.config.ts

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S aviation-ape -u 1001

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package.production.json package.json
COPY package-lock.json .
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=aviation-ape:nodejs /app/dist ./dist
COPY --from=builder --chown=aviation-ape:nodejs /app/shared ./shared
COPY --from=builder --chown=aviation-ape:nodejs /app/attached_assets ./attached_assets

# Copy additional configuration files
COPY --chown=aviation-ape:nodejs drizzle.config.ts .
COPY --chown=aviation-ape:nodejs tailwind.config.ts .
COPY --chown=aviation-ape:nodejs postcss.config.js .
COPY --chown=aviation-ape:nodejs tsconfig.json .

# Switch to non-root user
USER aviation-ape

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]