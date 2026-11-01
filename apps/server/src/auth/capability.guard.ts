import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { userHasCapability } from "@presscraft/auth";
import type { Database } from "@presscraft/database";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import type { AuthenticatedRequest } from "./session.guard.js";

export const REQUIRE_CAPABILITY_KEY = "requireCapability";

/**
 * Markiert einen Controller/Handler als capability-geschützt (ADR 0006,
 * ADR 0016: dieselbe Prüfung gilt für jeden Client, nicht nur das Admin-UI).
 * Muss zusammen mit SessionGuard registriert werden — SessionGuard setzt
 * request.userId, auf das dieser Guard aufbaut:
 * `@UseGuards(SessionGuard, CapabilityGuard)`.
 */
export const RequireCapability = (capabilityId: string) =>
  SetMetadata(REQUIRE_CAPABILITY_KEY, capabilityId);

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const capabilityId =
      this.reflector.get<string | undefined>(REQUIRE_CAPABILITY_KEY, context.getHandler()) ??
      this.reflector.get<string | undefined>(REQUIRE_CAPABILITY_KEY, context.getClass());
    if (!capabilityId) {
      // Kein @RequireCapability gesetzt — dieser Guard hat nichts zu prüfen.
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.userId) {
      throw new UnauthorizedException("Nicht angemeldet.");
    }

    const allowed = await userHasCapability(this.db, request.userId, capabilityId);
    if (!allowed) {
      throw new ForbiddenException(`Fehlende Capability "${capabilityId}".`);
    }
    return true;
  }
}
