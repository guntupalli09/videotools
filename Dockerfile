# Single image for API and worker. Node 18 LTS.
FROM node:20-slim

# FFmpeg + ffprobe required by workers (transcription, burn, compress, trim).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
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
