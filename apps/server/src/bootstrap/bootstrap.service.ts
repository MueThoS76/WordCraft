import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { eq, users, type Database } from "@presscraft/database";
import { ensureContentType, PAGE_CONTENT_TYPE } from "@presscraft/content";
import { DATABASE_CONNECTION } from "../database/database.module.js";

/**
 * Fester Platzhalter-User, dem Content-Items zugeordnet werden, solange es
 * noch keine echte Authentifizierung gibt (Implementierungsschritt 7).
 * TODO: entfernen, sobald eingeloggte User existieren — authorId kommt dann
 * aus der Session statt aus dieser Konstante.
 */
export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async onModuleInit(): Promise<void> {
    await ensureContentType(this.db, PAGE_CONTENT_TYPE);
    await this.ensureSystemUser();
    this.logger.log("Bootstrap abgeschlossen (Content-Typ 'page', System-User).");
  }

  private async ensureSystemUser(): Promise<void> {
    const existing = await this.db.select().from(users).where(eq(users.id, SYSTEM_USER_ID));
    if (existing.length > 0) {
      return;
    }

    await this.db.insert(users).values({
      id: SYSTEM_USER_ID,
      email: "system@presscraft.local",
      // Kein echter Hash — dieser Account kann sich nicht einloggen, es gibt
      // noch keinen Login-Endpunkt (Schritt 7).
      passwordHash: "disabled",
    });
  }
}
