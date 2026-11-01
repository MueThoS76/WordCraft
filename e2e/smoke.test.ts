import { generateTotp } from "@presscraft/auth";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * End-to-End-Smoke-Test:
 * - Meilenstein 1 (ADR 0015, Schritt 9): Login → Seite anlegen → Block
 *   hinzufügen → veröffentlichen → öffentliche URL prüft Inhalt.
 * - Userverwaltung (ADR 0017, Schritt 8): 2FA-Enrollment → zweistufiger
 *   Login (Passwort, dann TOTP-Code) → geschützter Endpunkt vor Abschluss
 *   gesperrt → falscher Code abgelehnt → richtiger Code schließt den Login ab.
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
 * Artefakte als eigenständige Prozesse. @presscraft/auth ist die einzige
 * Ausnahme: generateTotp() ist eine reine Funktion ohne DB-/Nest-Anbindung,
 * genau das, was auch eine echte Authenticator-App offline berechnet — kein
 * Zugriff auf Server-internen Zustand.
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

  it("2FA-Login: Enroll → Login erfordert Code → falscher Code 401 → richtiger Code 200", async () => {
    const adminLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    expect(adminLoginResponse.status).toBe(200);
    const adminCookie = adminLoginResponse.headers.get("set-cookie")!.split(";")[0];

    const email = `e2e-2fa-${Date.now()}@example.com`;
    const password = "e2e-test-password";
    const createUserResponse = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ email, password }),
    });
    expect(createUserResponse.ok).toBe(true);
    const createdUser = (await createUserResponse.json()) as { id: string };

    try {
      const firstLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      expect(firstLoginResponse.status).toBe(200);
      expect((await firstLoginResponse.json()).requiresTwoFactor).toBe(false);
      const userCookie = firstLoginResponse.headers.get("set-cookie")!.split(";")[0];

      const enrollResponse = await fetch(`${API_BASE_URL}/me/2fa/enroll`, {
        method: "POST",
        headers: { Cookie: userCookie },
      });
      expect(enrollResponse.ok).toBe(true);
      const { secret } = (await enrollResponse.json()) as { secret: string };

      const confirmResponse = await fetch(`${API_BASE_URL}/me/2fa/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: userCookie },
        body: JSON.stringify({ code: generateTotp(secret) }),
      });
      expect(confirmResponse.ok).toBe(true);

      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Cookie: userCookie },
      });

      const secondLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      expect(secondLoginResponse.status).toBe(200);
      expect((await secondLoginResponse.json()).requiresTwoFactor).toBe(true);
      const pendingCookie = secondLoginResponse.headers.get("set-cookie")!.split(";")[0];

      const blockedResponse = await fetch(`${API_BASE_URL}/me`, {
        headers: { Cookie: pendingCookie },
      });
      expect(blockedResponse.status).toBe(401);

      const wrongCodeResponse = await fetch(`${API_BASE_URL}/auth/login/2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: pendingCookie },
        body: JSON.stringify({ code: "000000" }),
      });
      expect(wrongCodeResponse.status).toBe(401);

      const correctCodeResponse = await fetch(`${API_BASE_URL}/auth/login/2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: pendingCookie },
        body: JSON.stringify({ code: generateTotp(secret) }),
      });
      expect(correctCodeResponse.status).toBe(200);

      const meResponse = await fetch(`${API_BASE_URL}/me`, { headers: { Cookie: pendingCookie } });
      expect(meResponse.status).toBe(200);
      expect((await meResponse.json()).email).toBe(email);
    } finally {
      await fetch(`${API_BASE_URL}/users/${createdUser.id}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
    }
  });
});
