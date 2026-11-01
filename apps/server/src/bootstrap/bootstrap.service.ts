import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  addUserToGroup,
  createGroup,
  createUser,
  ensureCapability,
  getGroupByName,
  getUserByEmail,
  grantCapabilityToGroup,
} from "@presscraft/auth";
import { ensureContentType, PAGE_CONTENT_TYPE } from "@presscraft/content";
import type { Database } from "@presscraft/database";
import { ADMIN_GROUP_NAME, CORE_CAPABILITIES } from "../auth/core-capabilities.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async onModuleInit(): Promise<void> {
    await ensureContentType(this.db, PAGE_CONTENT_TYPE);

    for (const capability of CORE_CAPABILITIES) {
      await ensureCapability(this.db, capability);
    }

    const adminGroup = await this.ensureAdminGroup();
    const adminUser = await this.ensureAdminUser();
    // Idempotent (onConflictDoNothing) — holt auch einen Admin-Account aus
    // einem Deployment von vor diesem Schritt nachträglich in die Gruppe.
    await addUserToGroup(this.db, adminUser.id, adminGroup.id);

    this.logger.log(
      "Bootstrap abgeschlossen (Content-Typ 'page', Core-Capabilities, Administratoren-Gruppe, Admin-Account).",
    );
  }

  private async ensureAdminGroup() {
    const existing = await getGroupByName(this.db, ADMIN_GROUP_NAME);
    const group = existing ?? (await createGroup(this.db, { name: ADMIN_GROUP_NAME }));

    for (const capability of CORE_CAPABILITIES) {
      await grantCapabilityToGroup(this.db, group.id, capability.id);
    }
    return group;
  }

  /**
   * Legt einen ersten Admin-Account an, falls noch keiner existiert.
   *
   * ACHTUNG: Das ist ein pragmatischer Platzhalter für Meilenstein 1, kein
   * echter Einrichtungsassistent (der ist Vision, siehe
   * docs/vision/feature-roadmap.md). Passwort kommt aus ADMIN_PASSWORD oder
   * einem unsicheren Dev-Default — vor echtem Einsatz ändern.
   */
  private async ensureAdminUser() {
    const email = process.env.ADMIN_EMAIL ?? "admin@presscraft.local";
    const existing = await getUserByEmail(this.db, email);
    if (existing) {
      return existing;
    }

    const password = process.env.ADMIN_PASSWORD ?? "presscraft-dev";
    const created = await createUser(this.db, { email, password });
    this.logger.warn(
      `Admin-Account "${email}" wurde mit einem Dev-Default-Passwort angelegt. ` +
        "Vor produktivem Einsatz über ADMIN_PASSWORD ein echtes Passwort setzen " +
        "oder (sobald vorhanden) den Einrichtungsassistenten nutzen.",
    );
    return created;
  }
}
