import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { sql, type Database } from "@presscraft/database";
import { DATABASE_CONNECTION } from "../database/database.module.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  async check(): Promise<{ status: "ok" }> {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException("Datenbank nicht erreichbar.");
    }
    return { status: "ok" };
  }
}
