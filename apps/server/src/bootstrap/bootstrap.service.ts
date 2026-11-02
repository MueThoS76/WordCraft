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
import { ensureContentType, PAGE_CONTENT_TYPE, POST_CONTENT_TYPE } from "@presscraft/content";
import type { Database } from "@presscraft/database";
import { ADMIN_GROUP_NAME, CORE_CAPABILITIES } from "../auth/core-capabilities.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async onModuleInit(): Promise<void> {
    await ensureContentType(this.db, PAGE_CONTENT_TYPE);
    await ensureContentType(this.db, POST_CONTENT_TYPE);

    for (const capability of CORE_CAPABILITIES) {
      await ensureCapability(this.db, capability);
    }

    const adminGroup = await this.ensureAdminGroup();
    const adminUser = await this.ensureAdminUser();
    if (adminUser) {
      // Idempotent (onConflictDoNothing) — holt auch einen Admin-Account aus
      // einem Deployment von vor diesem Schritt nachträglich in die Gruppe.
      await addUserToGroup(this.db, adminUser.id, adminGroup.id);
    }

    this.logger.log(
      "Bootstrap abgeschlossen (Content-Typen 'page' und 'post', Core-Capabilities, Administratoren-Gruppe, Admin-Account).",
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
   * Legt den ersten Admin-Account nur an, wenn ADMIN_PASSWORD ausdrücklich
   * gesetzt ist (Automatisierung, Entwicklung, Tests). Ohne diese Variable
   * gibt es bewusst KEIN Standardpasswort: Eine frische Installation zeigt
   * stattdessen den Einrichtungsassistenten (siehe SetupController), in dem
   * der Betreiber seinen eigenen Admin-Account anlegt.
   */
  private async ensureAdminUser() {
    const password = process.env.ADMIN_PASSWORD || undefined;
    if (!password) {
      return undefined;
    }
    const email = process.env.ADMIN_EMAIL || "admin@presscraft.local";
    const existing = await getUserByEmail(this.db, email);
    if (existing) {
      return existing;
    }
    return createUser(this.db, { email, password });
  }
}
