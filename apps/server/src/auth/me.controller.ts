import { Controller, Get, Inject, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { getUserById } from "@presscraft/auth";
import type { Database } from "@presscraft/database";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import { type AuthenticatedRequest, SessionGuard } from "./session.guard.js";

/** Liefert den eingeloggten User selbst — das Admin-UI braucht das, um z. B.
 * den eigenen 2FA-Status anzuzeigen, ohne die User-ID separat zu kennen. */
@Controller("me")
@UseGuards(SessionGuard)
export class MeController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  async get(@Req() request: AuthenticatedRequest) {
    const user = await getUserById(this.db, request.userId);
    if (!user) {
      throw new UnauthorizedException("User nicht gefunden.");
    }
    return user;
  }
}
