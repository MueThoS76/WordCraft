import { Controller, Get, Inject } from "@nestjs/common";
import type { Database } from "@presscraft/database";
import { listContentTypes } from "@presscraft/content";
import { DATABASE_CONNECTION } from "../database/database.module.js";

@Controller("content-types")
export class ContentTypesController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  list() {
    return listContentTypes(this.db);
  }
}
