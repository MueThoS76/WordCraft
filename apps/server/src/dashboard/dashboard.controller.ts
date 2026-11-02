import { readFileSync } from "node:fs";
import path from "node:path";
import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import { userHasCapability } from "@presscraft/auth";
import { getContentStats, listCategoriesWithCounts } from "@presscraft/content";
import { count, groups, sql, users, type Database } from "@presscraft/database";
import { getMediaStats } from "@presscraft/media";
import {
  CAPABILITY_CONTENT_MANAGE,
  CAPABILITY_MEDIA_MANAGE,
  CAPABILITY_USERS_MANAGE,
} from "../auth/core-capabilities.js";
import { SessionGuard, type AuthenticatedRequest } from "../auth/session.guard.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";

function readVersion(): string {
  try {
    const file = path.resolve(import.meta.dirname, "../../package.json");
    return (JSON.parse(readFileSync(file, "utf8")) as { version?: string }).version ?? "unbekannt";
  } catch {
    return "unbekannt";
  }
}

const VERSION = readVersion();

/**
 * Admin-Startseite. Jeder angemeldete User darf sie öffnen, sieht aber nur
 * die Abschnitte, für die er die passende Capability hat (ADR 0006).
 * Bewusst nur Kennzahlen und Systemstatus — keine Werbung (ADR 0010).
 */
@Controller("dashboard")
@UseGuards(SessionGuard)
export class DashboardController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  async get(@Req() request: AuthenticatedRequest) {
    const can = (capability: string) => userHasCapability(this.db, request.userId, capability);
    const [canContent, canMedia, canUsers] = await Promise.all([
      can(CAPABILITY_CONTENT_MANAGE),
      can(CAPABILITY_MEDIA_MANAGE),
      can(CAPABILITY_USERS_MANAGE),
    ]);

    const started = Date.now();
    await this.db.execute(sql`select 1`);
    const databaseLatencyMs = Date.now() - started;

    return {
      system: {
        version: VERSION,
        nodeVersion: process.version,
        uptimeSeconds: Math.round(process.uptime()),
        database: { ok: true, latencyMs: databaseLatencyMs },
      },
      content: canContent
        ? {
            ...(await getContentStats(this.db)),
            categories: (await listCategoriesWithCounts(this.db)).length,
          }
        : null,
      media: canMedia ? await getMediaStats(this.db) : null,
      users: canUsers
        ? {
            users: (await this.db.select({ n: count() }).from(users))[0].n,
            groups: (await this.db.select({ n: count() }).from(groups))[0].n,
          }
        : null,
    };
  }
}
