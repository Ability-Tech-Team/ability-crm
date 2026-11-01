# Ability CRM as a standalone container. Build and run it with the
# docker:prod:* scripts (scripts/docker.sh). The image holds no env file: its
# settings (.env.example) come from the env file the container starts with.

# ---------- Builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN NEXT_OUTPUT=standalone npm run build

# ---------- Production ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Only the standalone server, its static files, and public assets.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/aws/health-check || exit 1

CMD ["node", "server.js"]
