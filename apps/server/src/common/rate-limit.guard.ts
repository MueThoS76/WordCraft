import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyRequest } from "fastify";

export const RATE_LIMIT_KEY = "rateLimit";

export interface RateLimitOptions {
  /** Erlaubte Anfragen pro Zeitfenster und Client. */
  limit: number;
  windowMs: number;
}

/** Begrenzt, wie oft ein Client (IP) einen Endpunkt pro Zeitfenster aufrufen darf. */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Einfacher Zeitfenster-Zähler im Arbeitsspeicher — schützt Login, 2FA und
 * Einrichtung gegen Durchprobieren. Gilt pro Server-Instanz; bei mehreren
 * Instanzen bräuchte es einen gemeinsamen Speicher (z. B. die Datenbank).
 * Hinter einem Reverse Proxy muss TRUST_PROXY=true gesetzt sein, sonst sehen
 * alle Anfragen dieselbe IP.
 */
const hits = new Map<string, number[]>();
const MAX_TRACKED_KEYS = 10_000;

/** Nur für Tests: leert alle Zähler. */
export function resetRateLimits(): void {
  hits.clear();
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  // Explizit @Inject, damit es auch unter tsx/esbuild ohne Decorator-Metadaten läuft
  // (siehe CapabilityGuard).
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    if (!options || options.limit <= 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const key = `${request.method} ${request.routeOptions?.url ?? request.url}|${request.ip}`;
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((time) => now - time < options.windowMs);

    if (recent.length >= options.limit) {
      hits.set(key, recent);
      throw new HttpException(
        "Zu viele Versuche. Bitte warte einen Moment und versuche es dann erneut.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    hits.set(key, recent);

    if (hits.size > MAX_TRACKED_KEYS) {
      for (const [trackedKey, times] of hits) {
        if (times.every((time) => now - time >= options.windowMs)) {
          hits.delete(trackedKey);
        }
      }
    }
    return true;
  }
}

/** Anmelde-Limit pro Minute; per LOGIN_RATE_LIMIT änderbar, 0 schaltet es ab. */
export function loginRateLimit(): RateLimitOptions {
  const configured = Number(process.env.LOGIN_RATE_LIMIT);
  return {
    limit: Number.isFinite(configured) && process.env.LOGIN_RATE_LIMIT ? configured : 10,
    windowMs: 60_000,
  };
}
