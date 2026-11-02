# Baut apps/web (Astro, On-Demand-Rendering über den Node-Adapter) für
# Self-Hosting (ADR 0015, Schritt 10). Selbes Prinzip wie server.Dockerfile:
# ganzes Repo kopieren und bauen, keine Größenoptimierung in Meilenstein 1.
FROM node:22-alpine

RUN corepack enable
WORKDIR /repo

COPY . .

RUN pnpm install --frozen-lockfile

# Turbo baut zuerst alle Abhängigkeiten von apps/web in der richtigen Reihenfolge.
RUN pnpm exec turbo run build --filter="@presscraft/web^..." && \
    pnpm --filter @presscraft/web build

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD ["node", "apps/web/dist/server/entry.mjs"]
