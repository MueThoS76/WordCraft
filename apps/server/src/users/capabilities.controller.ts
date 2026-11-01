import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { listCapabilities } from "@presscraft/auth";
import type { Database } from "@presscraft/database";
import { CapabilityGuard, RequireCapability } from "../auth/capability.guard.js";
import { CAPABILITY_USERS_MANAGE } from "../auth/core-capabilities.js";
import { SessionGuard } from "../auth/session.guard.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";

/** Liste der bekannten Capabilities — damit das Admin-UI weiß, was einer
 * Gruppe überhaupt zuweisbar ist (ADR 0006, ADR 0016). */
@Controller("capabilities")
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability(CAPABILITY_USERS_MANAGE)
export class CapabilitiesController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  list() {
    return listCapabilities(this.db);
  }
}
