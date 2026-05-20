# --- STAGE 1: Build (Using Node for stability) ---
FROM node:20-slim AS builder
WORKDIR /app

# Build-time arguments for SvelteKit public env vars
ARG PUBLIC_PB_URL
ARG PUBLIC_VAPID_PUBLIC_KEY
ENV PUBLIC_PB_URL=$PUBLIC_PB_URL
ENV PUBLIC_VAPID_PUBLIC_KEY=$PUBLIC_VAPID_PUBLIC_KEY
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- STAGE 2: Runtime (Using Bun for performance) ---
FROM oven/bun:latest AS runner
WORKDIR /app

# 1. Install Chromium AND its dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    wget \
    xdg-utils \
 && rm -rf /var/lib/apt/lists/*

# 2. Tell Puppeteer to use the system Chromium instead of downloading its own
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 3. Copy built output and dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules

ENV PORT=9173
EXPOSE 9173

CMD ["bun", "build/index.js"]
