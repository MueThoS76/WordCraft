# Baut apps/server für Self-Hosting (ADR 0015, Schritt 10).
#
# Bewusst ein einzelnes Image, das das ganze Repo kopiert und baut, statt
# eines größen-optimierten Multi-Stage-Builds mit `pnpm deploy` — für
# Meilenstein 1 Einfachheit vor Image-Größe. Optimierung ist eine spätere,
# unabhängige Verbesserung, keine Architekturentscheidung.
FROM node:22-alpine

RUN corepack enable
WORKDIR /repo

COPY . .

RUN pnpm install --frozen-lockfile

# apps/admin wird als statischer Build vom Server mitgeliefert (main.ts
# serviert ihn unter /admin). VITE_API_BASE_URL relativ, weil Admin und API
# im Self-Hosting-Setup vom selben Origin ausgeliefert werden.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_WEB_BASE_URL=http://localhost:4321
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WEB_BASE_URL=${VITE_WEB_BASE_URL}

RUN pnpm --filter @presscraft/blocks build && \
    pnpm --filter @presscraft/database build && \
    pnpm --filter @presscraft/content build && \
    pnpm --filter @presscraft/auth build && \
    pnpm --filter @presscraft/admin build:selfhosted && \
    pnpm --filter @presscraft/server build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/server/dist/main.js"]
