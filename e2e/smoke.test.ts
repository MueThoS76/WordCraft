import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * End-to-End-Smoke-Test für Meilenstein 1 (ADR 0015, Schritt 9):
 * Login → Seite anlegen → Block hinzufügen → veröffentlichen → öffentliche
 * URL prüft Inhalt.
 *
 * Startet apps/server und apps/web (Astro-Preview, also den bereits
 * gebauten Stand) selbst als Child-Prozesse, auf separaten Ports, damit ein
 * parallel laufender Dev-Stand nicht kollidiert. Voraussetzung: `pnpm build`
 * ist bereits gelaufen (Astro-Preview braucht den dist/-Ordner) und Postgres
 * läuft (`pnpm db:up`) mit einer gesetzten DATABASE_URL.
 *
 * @presscraft/server und @presscraft/web stehen nur als devDependencies in
 * package.json, damit Turborepo die richtige Build-Reihenfolge kennt —
 * dieser Test importiert ihren Code nicht, sondern startet ihre gebauten
 * Artefakte als eigenständige Prozesse.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://presscraft:presscraft@localhost:5433/presscraft";
const SERVER_PORT = 3100;
const WEB_PORT = 4400;
const API_BASE_URL = `http://localhost:${SERVER_PORT}/api/v1`;
const WEB_BASE_URL = `http://localhost:${WEB_PORT}`;

let serverProcess: ChildProcess | undefined;
let webProcess: ChildProcess | undefined;

function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() > deadline) {
            reject(new Error(`Timeout beim Warten auf ${url}`));
            return;
          }
          setTimeout(attempt, 300);
        });
    };
    attempt();
  });
}

beforeAll(async () => {
  serverProcess = spawn("node", ["apps/server/dist/main.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      DATABASE_URL,
      PORT: String(SERVER_PORT),
      ADMIN_ORIGIN: WEB_BASE_URL,
    },
    stdio: "pipe",
  });
  await waitForHttp(`${API_BASE_URL}/health`, 20000);

  webProcess = spawn("pnpm", ["exec", "astro", "preview", "--port", String(WEB_PORT)], {
    cwd: path.join(ROOT, "apps/web"),
    env: { ...process.env, API_BASE_URL },
    stdio: "pipe",
  });
  await waitForHttp(WEB_BASE_URL, 20000);
}, 30000);

afterAll(() => {
  serverProcess?.kill();
  webProcess?.kill();
});

describe("Meilenstein 1 Smoke-Test", () => {
  it("Login → Seite anlegen → Block hinzufügen → veröffentlichen → öffentlich sichtbar", async () => {
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    expect(loginResponse.status).toBe(200);
    const setCookie = loginResponse.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    const sessionCookie = setCookie!.split(";")[0];

    const slug = `e2e-smoke-${Date.now()}`;
    const createResponse = await fetch(`${API_BASE_URL}/content/page`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ slug, title: "E2E Smoke Test" }),
    });
    expect(createResponse.ok).toBe(true);
    const page = (await createResponse.json()) as { id: string };

    const patchResponse = await fetch(`${API_BASE_URL}/content/page/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({
        blockBody: {
          schemaVersion: 1,
          blocks: [
            {
              id: "123e4567-e89b-12d3-a456-426614174099",
              type: "core/paragraph",
              attributes: { text: "Smoke-Test-Inhalt" },
            },
          ],
        },
      }),
    });
    expect(patchResponse.ok).toBe(true);

    const publishResponse = await fetch(`${API_BASE_URL}/content/page/${page.id}/publish`, {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });
    expect(publishResponse.ok).toBe(true);

    const publicHtml = await fetch(`${WEB_BASE_URL}/${slug}`).then((response) => response.text());
    expect(publicHtml).toContain("E2E Smoke Test");
    expect(publicHtml).toContain("Smoke-Test-Inhalt");

    await fetch(`${API_BASE_URL}/content/page/${page.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie },
    });
  });
});
