# Multi-stage production Dockerfile for Money Manager Frontend

# Stage 1: Build the Vite production bundle
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and assets
COPY index.html ./
COPY vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# Compile production assets
RUN npm run build

# Stage 2: Serve optimized assets with Nginx
FROM nginx:alpine AS runner

# Remove default nginx webpage
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
