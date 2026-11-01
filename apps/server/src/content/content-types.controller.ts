import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { listContentTypes } from "@presscraft/content";
import type { Database } from "@presscraft/database";
import { CapabilityGuard, RequireCapability } from "../auth/capability.guard.js";
import { CAPABILITY_CONTENT_MANAGE } from "../auth/core-capabilities.js";
import { SessionGuard } from "../auth/session.guard.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";

@Controller("content-types")
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability(CAPABILITY_CONTENT_MANAGE)
export class ContentTypesController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  list() {
    return listContentTypes(this.db);
  }
}
