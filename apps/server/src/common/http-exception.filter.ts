import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Vereinheitlicht NestJS' Standard-Fehlerformat auf das in ADR 0014
 * festgelegte Schema: { error: { code, message } }.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * `serveAdminFallback`: Das Admin-UI nutzt echte URLs (/admin/posts, …). Lädt
   * jemand so eine Adresse direkt (Reload, Lesezeichen), gibt es dafür keine
   * Datei — dann liefern wir index.html aus, damit der Router im Browser
   * übernimmt. Dateien mit Endung (Assets) und alles außerhalb von /admin
   * bleiben ein normaler 404.
   */
  constructor(private readonly options: { serveAdminFallback?: boolean } = {}) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const request = host.switchToHttp().getRequest<FastifyRequest>();

    if (
      this.options.serveAdminFallback &&
      exception instanceof NotFoundException &&
      isAdminDeepLink(request)
    ) {
      void response.type("text/html; charset=utf-8").sendFile("index.html");
      return;
    }

    const status = exception.getStatus();
    const body = exception.getResponse();
    const message =
      typeof body === "string"
        ? body
        : ((body as { message?: string | string[] }).message ?? exception.message);

    response.status(status).send({
      error: {
        code: exception.constructor.name,
        message,
      },
    });
  }
}

function isAdminDeepLink(request: FastifyRequest): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }
  const pathname = request.url.split("?")[0];
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const looksLikeFile = (pathname.split("/").pop() ?? "").includes(".");
  return inAdmin && !looksLikeFile;
}
