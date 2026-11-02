import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Post,
} from "@nestjs/common";
import { addUserToGroup, createUser, getGroupByName } from "@presscraft/auth";
import { updateSiteSettings } from "@presscraft/content";
import { count, users, type Database } from "@presscraft/database";
import { z } from "zod";
import { ADMIN_GROUP_NAME } from "../auth/core-capabilities.js";
import { hasPgErrorCode } from "../common/pg-error.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";

const setupSchema = z.object({
  email: z.string().trim().email(),
  // Für den ersten Admin-Account bewusst strenger als der allgemeine Mindestwert.
  password: z.string().min(12, "Das Passwort muss mindestens 12 Zeichen lang sein."),
  siteTitle: z.string().trim().min(1).max(100).optional(),
});

/**
 * Einrichtungsassistent (ADR 0010, Roadmap "Einrichtung & Betrieb"). Die
 * Endpunkte sind absichtlich unauthentifiziert — es gibt ja noch keinen User —
 * funktionieren aber nur, solange die Installation leer ist. Danach liefert
 * POST /setup immer 403.
 */
@Controller("setup")
export class SetupController {
  /** Verhindert, dass zwei gleichzeitige Requests beide "leer" sehen (eine Server-Instanz). */
  private running = false;

  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  private async hasUsers(): Promise<boolean> {
    const [row] = await this.db.select({ total: count() }).from(users);
    return row.total > 0;
  }

  @Get("status")
  async status() {
    return { setupRequired: !(await this.hasUsers()) };
  }

  @Post()
  async setup(@Body() body: unknown) {
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((issue) => issue.message).join(", "));
    }
    if (this.running) {
      throw new ConflictException("Die Einrichtung läuft bereits.");
    }
    this.running = true;
    try {
      if (await this.hasUsers()) {
        throw new ForbiddenException("Die Einrichtung ist bereits abgeschlossen.");
      }
      const adminGroup = await getGroupByName(this.db, ADMIN_GROUP_NAME);
      if (!adminGroup) {
        throw new ConflictException("Administratoren-Gruppe fehlt — Server neu starten.");
      }
      const user = await createUser(this.db, {
        email: parsed.data.email,
        password: parsed.data.password,
      });
      await addUserToGroup(this.db, user.id, adminGroup.id);
      if (parsed.data.siteTitle) {
        await updateSiteSettings(this.db, { siteTitle: parsed.data.siteTitle });
      }
      return { success: true };
    } catch (error) {
      if (hasPgErrorCode(error, "23505")) {
        throw new ConflictException("Diese E-Mail-Adresse ist bereits vergeben.");
      }
      throw error;
    } finally {
      this.running = false;
    }
  }
}
