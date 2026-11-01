import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { getValidSession } from "@presscraft/auth";
import type { Database } from "@presscraft/database";
import type { FastifyRequest } from "fastify";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import { SESSION_COOKIE_NAME } from "./session-cookie.js";

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
}

/**
 * Prüft "eingeloggt" UND (ab ADR 0017, Schritt 6) "2FA-Schritt abgeschlossen,
 * falls nötig" — kein Capability-Check hier, das übernimmt CapabilityGuard.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { userId?: string }>();
    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      throw new UnauthorizedException("Nicht angemeldet.");
    }

    const session = await getValidSession(this.db, sessionId);
    if (!session) {
      throw new UnauthorizedException("Session ungültig oder abgelaufen.");
    }
    if (!session.twoFactorVerified) {
      throw new UnauthorizedException("Zwei-Faktor-Authentifizierung ausstehend.");
    }

    request.userId = session.userId;
    return true;
  }
}
