# Production Dockerfile for Money Manager Backend
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies needed for node-gyp if any native modules are present
RUN apk add --no-cache python3 make g++

# Copy dependency specifications
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY src/ ./src/

# Create uploads directory and logs directory
RUN mkdir -p uploads logs && chown -R node:node /app

# Switch to non-root user for security
USER node

# Environment defaults
ENV NODE_ENV=production
ENV PORT=5001
ENV UPLOAD_DIR=uploads

EXPOSE 5001

CMD ["node", "src/server.js"]
