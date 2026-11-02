import { generateTotp } from "@presscraft/auth";
import { spawn, type ChildProcess } from "node:child_process";
import os from "node:os";
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
      // Eigenes Medienverzeichnis, damit der Test keine echten Uploads berührt.
      MEDIA_DIR: path.join(os.tmpdir(), `presscraft-e2e-media-${process.pid}`),
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

describe("Medienbibliothek", () => {
  const PNG_BYTES = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64),
  ]);

  async function loginAsAdmin(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    expect(response.status).toBe(200);
    return response.headers.get("set-cookie")!.split(";")[0];
  }

  function formWith(data: Buffer, filename: string, type: string): FormData {
    const form = new FormData();
    form.append("file", new Blob([data], { type }), filename);
    return form;
  }

  it("Upload → öffentlich abrufbar → Alt-Text ändern → löschen", async () => {
    const cookie = await loginAsAdmin();

    const uploadResponse = await fetch(`${API_BASE_URL}/media`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: formWith(PNG_BYTES, "e2e.png", "image/png"),
    });
    expect(uploadResponse.status).toBe(201);
    const item = (await uploadResponse.json()) as { id: string; url: string; mimeType: string };
    expect(item.mimeType).toBe("image/png");

    // Auslieferung ohne Login — Bilder in veröffentlichten Seiten müssen öffentlich sein.
    const fileResponse = await fetch(
      item.url.replace(/^https?:\/\/[^/]+/, `http://localhost:${SERVER_PORT}`),
    );
    expect(fileResponse.status).toBe(200);
    expect(fileResponse.headers.get("content-type")).toContain("image/png");
    expect(fileResponse.headers.get("x-content-type-options")).toBe("nosniff");

    const patchResponse = await fetch(`${API_BASE_URL}/media/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ altText: "Testbild" }),
    });
    expect(patchResponse.ok).toBe(true);
    expect(((await patchResponse.json()) as { altText: string }).altText).toBe("Testbild");

    const deleteResponse = await fetch(`${API_BASE_URL}/media/${item.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(deleteResponse.ok).toBe(true);
    const goneResponse = await fetch(
      `http://localhost:${SERVER_PORT}/api/v1/media/files/${item.url.split("/").pop()}`,
    );
    expect(goneResponse.status).toBe(404);
  });

  it("lehnt SVG, Fake-Endungen und Uploads ohne Login ab", async () => {
    const cookie = await loginAsAdmin();

    const svgResponse = await fetch(`${API_BASE_URL}/media`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: formWith(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        "evil.png",
        "image/png",
      ),
    });
    expect(svgResponse.status).toBe(400);

    const anonymousResponse = await fetch(`${API_BASE_URL}/media`, {
      method: "POST",
      body: formWith(PNG_BYTES, "e2e.png", "image/png"),
    });
    expect(anonymousResponse.status).toBe(401);

    const listAnonymous = await fetch(`${API_BASE_URL}/media`);
    expect(listAnonymous.status).toBe(401);
  });
});

describe("Beiträge und Kategorien", () => {
  it("Kategorie + Beitrag anlegen → veröffentlichen → in Blog, Kategorie und Detailseite sichtbar", async () => {
    const login = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const json = { "Content-Type": "application/json", Cookie: cookie };
    const unique = Date.now();

    const categoryResponse = await fetch(`${API_BASE_URL}/categories`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ name: `E2E Kategorie ${unique}` }),
    });
    expect(categoryResponse.status).toBe(201);
    const category = (await categoryResponse.json()) as { id: string; slug: string };

    const postResponse = await fetch(`${API_BASE_URL}/content/post`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ slug: `e2e-post-${unique}`, title: `E2E Beitrag ${unique}` }),
    });
    expect(postResponse.status).toBe(201);
    const post = (await postResponse.json()) as { id: string; slug: string };

    await fetch(`${API_BASE_URL}/content/post/${post.id}`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({ fieldValues: { excerpt: "E2E-Auszug" } }),
    });
    const assign = await fetch(`${API_BASE_URL}/content/post/${post.id}/categories`, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ categoryIds: [category.id] }),
    });
    expect(assign.ok).toBe(true);

    // Entwurf: weder in der öffentlichen Liste noch auf der Detailseite.
    const draftList = (await (
      await fetch(`${API_BASE_URL}/public/posts?category=${category.slug}`)
    ).json()) as { total: number };
    expect(draftList.total).toBe(0);

    await fetch(`${API_BASE_URL}/content/post/${post.id}/publish`, {
      method: "POST",
      headers: { Cookie: cookie },
    });

    const list = (await (
      await fetch(`${API_BASE_URL}/public/posts?category=${category.slug}`)
    ).json()) as { total: number; items: { slug: string; excerpt: string }[] };
    expect(list.total).toBe(1);
    expect(list.items[0]).toMatchObject({ slug: post.slug, excerpt: "E2E-Auszug" });

    const blogHtml = await fetch(`${WEB_BASE_URL}/blog`).then((response) => response.text());
    expect(blogHtml).toContain(`E2E Beitrag ${unique}`);
    const categoryHtml = await fetch(`${WEB_BASE_URL}/kategorie/${category.slug}`).then(
      (response) => response.text(),
    );
    expect(categoryHtml).toContain(`E2E Beitrag ${unique}`);
    const detailHtml = await fetch(`${WEB_BASE_URL}/blog/${post.slug}`).then((response) =>
      response.text(),
    );
    expect(detailHtml).toContain(`E2E Kategorie ${unique}`);

    await fetch(`${API_BASE_URL}/content/post/${post.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    await fetch(`${API_BASE_URL}/categories/${category.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
  });
});

describe("Revisionen", () => {
  it("Verlauf entsteht beim Bearbeiten und Veröffentlichen; Wiederherstellen setzt den Entwurf zurück", async () => {
    const login = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const json = { "Content-Type": "application/json", Cookie: cookie };
    const bodyWith = (text: string) => ({
      schemaVersion: 1,
      blocks: [
        {
          id: "123e4567-e89b-12d3-a456-426614174077",
          type: "core/paragraph",
          attributes: { text },
        },
      ],
    });

    const created = await fetch(`${API_BASE_URL}/content/page`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ slug: `e2e-rev-${Date.now()}`, title: "Revisionen" }),
    });
    const page = (await created.json()) as { id: string };
    const patch = (text: string) =>
      fetch(`${API_BASE_URL}/content/page/${page.id}`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({ blockBody: bodyWith(text) }),
      });

    await patch("Stand 1");
    await fetch(`${API_BASE_URL}/content/page/${page.id}/publish`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    await patch("Stand 2");

    const list = (await (
      await fetch(`${API_BASE_URL}/content/page/${page.id}/revisions`, {
        headers: { Cookie: cookie },
      })
    ).json()) as { id: string; statusAtSave: string; snippet: string }[];
    expect(list.map((revision) => revision.statusAtSave)).toEqual(["draft", "published", "draft"]);

    const published = list.find((revision) => revision.statusAtSave === "published")!;
    const restoreResponse = await fetch(
      `${API_BASE_URL}/content/page/${page.id}/revisions/${published.id}/restore`,
      { method: "POST", headers: { Cookie: cookie } },
    );
    expect(restoreResponse.ok).toBe(true);
    const restored = (await restoreResponse.json()) as {
      blockBody: { blocks: { attributes: { text: string } }[] };
    };
    expect(restored.blockBody.blocks[0].attributes.text).toBe("Stand 1");

    const unknown = await fetch(
      `${API_BASE_URL}/content/page/${page.id}/revisions/00000000-0000-0000-0000-000000000000/restore`,
      { method: "POST", headers: { Cookie: cookie } },
    );
    expect(unknown.status).toBe(404);

    await fetch(`${API_BASE_URL}/content/page/${page.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
  });
});

describe("Dashboard", () => {
  it("zeigt Admins Kennzahlen, Usern ohne Rechte nur den Systemstatus", async () => {
    const adminLogin = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    const adminCookie = adminLogin.headers.get("set-cookie")!.split(";")[0];

    const adminData = (await (
      await fetch(`${API_BASE_URL}/dashboard`, { headers: { Cookie: adminCookie } })
    ).json()) as {
      system: { database: { ok: boolean } };
      content: { byType: object } | null;
      media: object | null;
      users: object | null;
    };
    expect(adminData.system.database.ok).toBe(true);
    expect(adminData.content).not.toBeNull();
    expect(adminData.media).not.toBeNull();
    expect(adminData.users).not.toBeNull();

    const email = `e2e-dashboard-${Date.now()}@example.com`;
    const password = "e2e-test-password";
    const created = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ email, password }),
    });
    const user = (await created.json()) as { id: string };
    try {
      const login = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const cookie = login.headers.get("set-cookie")!.split(";")[0];
      const restricted = (await (
        await fetch(`${API_BASE_URL}/dashboard`, { headers: { Cookie: cookie } })
      ).json()) as { content: unknown; media: unknown; users: unknown };
      expect(restricted).toMatchObject({ content: null, media: null, users: null });

      const anonymous = await fetch(`${API_BASE_URL}/dashboard`);
      expect(anonymous.status).toBe(401);
    } finally {
      await fetch(`${API_BASE_URL}/users/${user.id}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
    }
  });
});

describe("Einstellungen und Navigation", () => {
  it("Titel, Menü und Startseite wirken öffentlich; unsichere Links werden abgelehnt", async () => {
    const login = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const json = { "Content-Type": "application/json", Cookie: cookie };

    const original = await (await fetch(`${API_BASE_URL}/settings`, { headers: json })).json();
    try {
      const unique = `E2E-Titel-${Date.now()}`;
      const rejected = await fetch(`${API_BASE_URL}/settings`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({ navigation: [{ label: "böse", url: "javascript:alert(1)" }] }),
      });
      expect(rejected.status).toBe(400);

      const saved = await fetch(`${API_BASE_URL}/settings`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({
          siteTitle: unique,
          homepage: "blog",
          navigation: [{ label: "E2E-Menüpunkt", url: "/blog" }],
          footerText: "E2E-Fußzeile",
        }),
      });
      expect(saved.ok).toBe(true);

      const publicSettings = (await (await fetch(`${API_BASE_URL}/public/settings`)).json()) as {
        siteTitle: string;
      };
      expect(publicSettings.siteTitle).toBe(unique);

      const homeHtml = await fetch(`${WEB_BASE_URL}/`).then((response) => response.text());
      expect(homeHtml).toContain(unique);
      expect(homeHtml).toContain("E2E-Menüpunkt");
      expect(homeHtml).toContain("E2E-Fußzeile");

      const anonymous = await fetch(`${API_BASE_URL}/settings`);
      expect(anonymous.status).toBe(401);
    } finally {
      await fetch(`${API_BASE_URL}/settings`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify(original),
      });
    }
  });
});

describe("Block-Validierung", () => {
  it("speichert gültige Blöcke, lehnt unsichere Links und unbekannte Typen ab", async () => {
    const login = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const json = { "Content-Type": "application/json", Cookie: cookie };

    const created = await fetch(`${API_BASE_URL}/content/page`, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ slug: `e2e-blocks-${Date.now()}`, title: "Blöcke" }),
    });
    const page = (await created.json()) as { id: string };
    const save = (blocks: unknown[]) =>
      fetch(`${API_BASE_URL}/content/page/${page.id}`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({ blockBody: { schemaVersion: 1, blocks } }),
      });
    const block = (suffix: string, type: string, attributes: Record<string, unknown>) => ({
      id: `123e4567-e89b-12d3-a456-4266141740${suffix}`,
      type,
      attributes,
    });

    const valid = await save([
      block("01", "core/list", { ordered: false, items: ["a", "b"] }),
      block("02", "core/quote", { text: "Zitat" }),
      block("03", "core/divider", {}),
      block("04", "core/button", { label: "Los", url: "/blog" }),
      block("05", "core/image", { src: "", alt: "" }),
    ]);
    expect(valid.status).toBe(200);

    const unsafe = await save([
      block("06", "core/button", { label: "böse", url: "javascript:alert(1)" }),
    ]);
    expect(unsafe.status).toBe(400);

    const unknown = await save([block("07", "plugin/gibtsnicht", {})]);
    expect(unknown.status).toBe(400);

    await fetch(`${API_BASE_URL}/content/page/${page.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
  });
});

describe("Design (Theme)", () => {
  it("speichert ein gültiges Theme, wirkt im öffentlichen CSS, lehnt CSS-Injection ab und lässt sich zurücksetzen", async () => {
    const login = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const json = { "Content-Type": "application/json", Cookie: cookie };
    const patch = (theme: unknown) =>
      fetch(`${API_BASE_URL}/settings`, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({ theme }),
      });

    const original = (
      (await (await fetch(`${API_BASE_URL}/settings`, { headers: json })).json()) as {
        theme: unknown;
      }
    ).theme;
    const theme = {
      colors: {
        background: "#101010",
        text: "#fafafa",
        mutedText: "#aaaaaa",
        primary: "#ff8800",
        surface: "#202020",
        border: "#333333",
      },
      typography: { fontFamily: "serif", baseFontSize: 18, lineHeight: 1.7 },
      layout: { contentWidth: 640, radius: 10, headerStyle: "centered" },
    };
    try {
      expect((await patch(theme)).status).toBe(200);
      const html = await fetch(`${WEB_BASE_URL}/blog`).then((response) => response.text());
      expect(html).toContain("--pc-primary:#ff8800");
      expect(html).toContain("--pc-content-width:640px");
      expect(html).toContain("header-centered");

      const injected = structuredClone(theme);
      injected.colors.primary = "red;} body{display:none";
      expect((await patch(injected)).status).toBe(400);
      const stillOk = await fetch(`${WEB_BASE_URL}/blog`).then((response) => response.text());
      expect(stillOk).not.toContain("display:none");

      expect((await patch(null)).status).toBe(200);
      const reset = await fetch(`${WEB_BASE_URL}/blog`).then((response) => response.text());
      expect(reset).toContain("--pc-primary:#4f46e5");
    } finally {
      await patch(original);
    }
  });
});

describe("Feeds und SEO", () => {
  it("RSS, Sitemap und robots.txt enthalten Veröffentlichtes (maskiert), aber keine Entwürfe", async () => {
    const login = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@presscraft.local", password: "presscraft-dev" }),
    });
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    const json = { "Content-Type": "application/json", Cookie: cookie };
    const unique = Date.now();

    const create = async (slug: string, title: string) => {
      const response = await fetch(`${API_BASE_URL}/content/post`, {
        method: "POST",
        headers: json,
        body: JSON.stringify({ slug, title }),
      });
      return (await response.json()) as { id: string };
    };
    const published = await create(`e2e-feed-${unique}`, `Feed <Test> & "Quote" ${unique}`);
    const draft = await create(`e2e-feed-draft-${unique}`, `Entwurf ${unique}`);
    await fetch(`${API_BASE_URL}/content/post/${published.id}`, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({ fieldValues: { excerpt: "Meta & Auszug" } }),
    });
    await fetch(`${API_BASE_URL}/content/post/${published.id}/publish`, {
      method: "POST",
      headers: { Cookie: cookie },
    });

    try {
      const feed = await fetch(`${WEB_BASE_URL}/feed.xml`);
      expect(feed.headers.get("content-type")).toContain("rss+xml");
      const feedXml = await feed.text();
      expect(feedXml).toContain(`Feed &lt;Test&gt; &amp; &quot;Quote&quot; ${unique}`);
      expect(feedXml).not.toContain(`Entwurf ${unique}`);

      const sitemap = await fetch(`${WEB_BASE_URL}/sitemap.xml`).then((response) =>
        response.text(),
      );
      expect(sitemap).toContain(`/blog/e2e-feed-${unique}`);
      expect(sitemap).not.toContain(`e2e-feed-draft-${unique}`);

      const robots = await fetch(`${WEB_BASE_URL}/robots.txt`).then((response) => response.text());
      expect(robots).toContain("Sitemap:");

      const detail = await fetch(`${WEB_BASE_URL}/blog/e2e-feed-${unique}`).then((response) =>
        response.text(),
      );
      expect(detail).toContain('<meta name="description" content="Meta &#38; Auszug"');
    } finally {
      for (const id of [published.id, draft.id]) {
        await fetch(`${API_BASE_URL}/content/post/${id}`, {
          method: "DELETE",
          headers: { Cookie: cookie },
        });
      }
    }
  });
});
