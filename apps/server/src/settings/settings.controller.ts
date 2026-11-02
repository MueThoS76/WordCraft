import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { getSiteSettings, isSafeNavigationUrl, updateSiteSettings } from "@presscraft/content";
import type { Database } from "@presscraft/database";
import { themeConfigSchema } from "@presscraft/theme-sdk";
import { z } from "zod";
import { CapabilityGuard, RequireCapability } from "../auth/capability.guard.js";
import { CAPABILITY_SETTINGS_MANAGE } from "../auth/core-capabilities.js";
import { SessionGuard } from "../auth/session.guard.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";

const navigationItemSchema = z.object({
  label: z.string().trim().min(1).max(60),
  url: z
    .string()
    .trim()
    .max(500)
    .refine(isSafeNavigationUrl, "Link-Ziel muss mit / oder http(s):// beginnen."),
});

const updateSettingsSchema = z
  .object({
    siteTitle: z.string().trim().min(1).max(100),
    tagline: z.string().trim().max(200),
    // "blog" oder der Slug einer Seite.
    homepage: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9-]+$/i, "Ungültiger Slug."),
    navigation: z.array(navigationItemSchema).max(20),
    footerText: z.string().max(500),
    // null = zurück zum Standard-Theme. Sonst streng validiert (nur Hex-Farben,
    // Schrift aus fester Liste, Zahlen in Bereichen) — das Frontend gibt es als CSS aus.
    theme: themeConfigSchema.nullable(),
  })
  .partial();

@Controller("settings")
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability(CAPABILITY_SETTINGS_MANAGE)
export class SettingsController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  get() {
    return getSiteSettings(this.db);
  }

  @Patch()
  update(@Body() body: unknown) {
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((issue) => issue.message).join(", "));
    }
    return updateSiteSettings(this.db, parsed.data);
  }
}

/** Öffentlich lesbar: Titel, Menü und Startseite braucht jeder Besucher. */
@Controller("public/settings")
export class PublicSettingsController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  get() {
    return getSiteSettings(this.db);
  }
}
