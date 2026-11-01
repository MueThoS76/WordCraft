import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
  getUserById,
} from "@presscraft/auth";
import type { Database } from "@presscraft/database";
import { z, ZodError } from "zod";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import { type AuthenticatedRequest, SessionGuard } from "./session.guard.js";
import { totpCodeSchema } from "./two-factor.dto.js";

/**
 * Self-Service für die eigene 2FA — jeder eingeloggte User verwaltet sein
 * eigenes Secret, keine users.manage-Capability nötig (ADR 0006, ADR 0017
 * Schritt 6).
 */
@Controller("me/2fa")
@UseGuards(SessionGuard)
export class TwoFactorController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Post("enroll")
  async enroll(@Req() request: AuthenticatedRequest) {
    const user = await getUserById(this.db, request.userId);
    if (!user) {
      throw new BadRequestException("User nicht gefunden.");
    }
    return beginTotpEnrollment(this.db, request.userId, user.email);
  }

  @Post("confirm")
  async confirm(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const { code } = this.parse(totpCodeSchema, body);
    const ok = await confirmTotpEnrollment(this.db, request.userId, code);
    if (!ok) {
      throw new BadRequestException("Code ungültig.");
    }
    return { success: true };
  }

  @Post("disable")
  async disable(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const { code } = this.parse(totpCodeSchema, body);
    const ok = await disableTotp(this.db, request.userId, code);
    if (!ok) {
      throw new BadRequestException("Code ungültig.");
    }
    return { success: true };
  }

  private parse<T>(schema: z.ZodType<T>, body: unknown): T {
    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.issues.map((issue) => issue.message).join(", "));
      }
      throw error;
    }
  }
}
