# Single image for API and worker. Node 18 LTS.
FROM node:20-slim

# System dependencies (ffmpeg for workers; yt-dlp binary for URL-based video import).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (lockfile for reproducible builds)
COPY server/package.json server/package-lock.json ./
RUN npm ci

# Copy server source and build TypeScript
COPY server/ ./
RUN npm run build

# Prune dev dependencies to keep image smaller; runtime only needs dist + node_modules
RUN npm prune --omit=dev

EXPOSE 3001

# Default: run API. Override in docker-compose for worker.
CMD ["node", "dist/index.js"]
