# Single image for API and worker. Node 18 LTS.
FROM node:20-slim

# System dependencies (ffmpeg for workers; yt-dlp via pip for latest/pre-release; Deno for n/sig challenge).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    unzip \
    && pip3 install --break-system-packages -U --pre "yt-dlp[default]" \
    && yt-dlp --version \
    && curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
    && rm -rf /var/lib/apt/lists/* /root/.cache/pip

WORKDIR /app

# Install dependencies (lockfile for reproducible builds). Prisma needs schema + config for postinstall (prisma generate).
# Set a placeholder DATABASE_URL so prisma generate succeeds at build time; runtime URL comes from docker-compose env.
ENV DATABASE_URL=postgresql://videotools:videotools@localhost:5432/videotext
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma/
COPY server/prisma.config.ts ./
RUN npm ci

# Copy server source and build TypeScript
COPY server/ ./
RUN npm run build

# Prune dev dependencies to keep image smaller; runtime only needs dist + node_modules
RUN npm prune --omit=dev

EXPOSE 3001

# Default: run API. Override in docker-compose for worker.
CMD ["node", "dist/index.js"]
