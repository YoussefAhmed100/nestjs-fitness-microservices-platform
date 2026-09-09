# =========================
# 1. Build Stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build selected service
ARG SERVICE

RUN npx nest build ${SERVICE}


# =========================
# 2. Production Stage
# =========================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/dist ./dist

# Service name
ARG SERVICE
ENV SERVICE=${SERVICE}

# Run selected service
CMD ["sh", "-c", "node $(find dist/apps/${SERVICE} -name main.js | head -1)"]