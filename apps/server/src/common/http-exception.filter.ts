import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { FastifyReply } from "fastify";

/**
 * Vereinheitlicht NestJS' Standard-Fehlerformat auf das in ADR 0014
 * festgelegte Schema: { error: { code, message } }.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<FastifyReply>();
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
