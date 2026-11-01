import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { completeTwoFactorLogin, deleteSession, login } from "@presscraft/auth";
import type { Database } from "@presscraft/database";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import { SESSION_COOKIE_NAME } from "./session-cookie.js";
import { totpCodeSchema } from "./two-factor.dto.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@Controller("auth")
export class AuthController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    const { email, password } = this.parse(loginSchema, body);
    const result = await login(this.db, email, password);
    if (!result) {
      throw new UnauthorizedException("E-Mail oder Passwort falsch.");
    }

    reply.setCookie(SESSION_COOKIE_NAME, result.id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      expires: result.expiresAt,
      // TODO: secure: true, sobald der Server hinter HTTPS läuft (Schritt 10).
    });

    // Bei requiresTwoFactor=true ist die Session absichtlich noch nicht
    // vollständig (twoFactorVerified=false) — SessionGuard lehnt sie ab,
    // bis POST /auth/login/2fa den zweiten Schritt abschließt.
    return { success: true, requiresTwoFactor: result.requiresTwoFactor };
  }

  @Post("login/2fa")
  @HttpCode(200)
  async loginTwoFactor(@Req() request: FastifyRequest, @Body() body: unknown) {
    const { code } = this.parse(totpCodeSchema, body);
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      throw new UnauthorizedException("Keine ausstehende Anmeldung.");
    }

    const ok = await completeTwoFactorLogin(this.db, sessionId, code);
    if (!ok) {
      throw new UnauthorizedException("Code ungültig.");
    }
    return { success: true };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ success: true }> {
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId) {
      await deleteSession(this.db, sessionId);
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
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
