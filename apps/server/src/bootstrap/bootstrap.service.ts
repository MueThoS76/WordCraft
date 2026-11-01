import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { createUser, getUserByEmail } from "@presscraft/auth";
import { ensureContentType, PAGE_CONTENT_TYPE } from "@presscraft/content";
import type { Database } from "@presscraft/database";
import { DATABASE_CONNECTION } from "../database/database.module.js";

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async onModuleInit(): Promise<void> {
    await ensureContentType(this.db, PAGE_CONTENT_TYPE);
    await this.ensureAdminUser();
    this.logger.log("Bootstrap abgeschlossen (Content-Typ 'page', Admin-Account).");
  }

  /**
   * Legt einen ersten Admin-Account an, falls noch keiner existiert.
   *
   * ACHTUNG: Das ist ein pragmatischer Platzhalter für Meilenstein 1, kein
   * echter Einrichtungsassistent (der ist Vision, siehe
   * docs/vision/feature-roadmap.md). Passwort kommt aus ADMIN_PASSWORD oder
   * einem unsicheren Dev-Default — vor echtem Einsatz ändern.
   */
  private async ensureAdminUser(): Promise<void> {
    const email = process.env.ADMIN_EMAIL ?? "admin@presscraft.local";
    const existing = await getUserByEmail(this.db, email);
    if (existing) {
      return;
    }

    const password = process.env.ADMIN_PASSWORD ?? "presscraft-dev";
    await createUser(this.db, { email, password });
    this.logger.warn(
      `Admin-Account "${email}" wurde mit einem Dev-Default-Passwort angelegt. ` +
        "Vor produktivem Einsatz über ADMIN_PASSWORD ein echtes Passwort setzen " +
        "oder (sobald vorhanden) den Einrichtungsassistenten nutzen.",
    );
  }
}
