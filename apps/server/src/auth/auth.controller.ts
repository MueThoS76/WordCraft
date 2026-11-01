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
import { deleteSession, login } from "@presscraft/auth";
import type { Database } from "@presscraft/database";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import { SESSION_COOKIE_NAME } from "./session-cookie.js";

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
    const session = await login(this.db, email, password);
    if (!session) {
      throw new UnauthorizedException("E-Mail oder Passwort falsch.");
    }

    reply.setCookie(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      expires: session.expiresAt,
      // TODO: secure: true, sobald der Server hinter HTTPS läuft (Schritt 10).
    });

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
