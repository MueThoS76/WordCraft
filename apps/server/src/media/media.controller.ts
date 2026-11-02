import { createReadStream } from "node:fs";
import path from "node:path";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import type { Database } from "@presscraft/database";
import {
  MediaValidationError,
  deleteMedia,
  getMediaByStoredName,
  isValidStoredName,
  listMedia,
  resolveStoredPath,
  updateMediaAltText,
  uploadMedia,
} from "@presscraft/media";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { CapabilityGuard, RequireCapability } from "../auth/capability.guard.js";
import { CAPABILITY_MEDIA_MANAGE } from "../auth/core-capabilities.js";
import { SessionGuard, type AuthenticatedRequest } from "../auth/session.guard.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";

const updateMediaSchema = z.object({ altText: z.string().max(500) });

function mediaDir(): string {
  return process.env.MEDIA_DIR ?? path.resolve(import.meta.dirname, "../../uploads");
}

/**
 * Öffentliche Basis-URL für Datei-Links. Hinter einem Reverse Proxy muss
 * PUBLIC_URL gesetzt sein, sonst wird der interne Host eingetragen.
 */
function publicBaseUrl(request: FastifyRequest): string {
  const configured = process.env.PUBLIC_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return `${request.protocol}://${request.headers.host ?? "localhost:3000"}`;
}

function withUrl<T extends { storedName: string }>(item: T, request: FastifyRequest) {
  return { ...item, url: `${publicBaseUrl(request)}/api/v1/media/files/${item.storedName}` };
}

@Controller("media")
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability(CAPABILITY_MEDIA_MANAGE)
export class MediaController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  async list(@Req() request: FastifyRequest) {
    const items = await listMedia(this.db);
    return items.map((item) => withUrl(item, request));
  }

  @Post()
  async upload(@Req() request: AuthenticatedRequest) {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException("Keine Datei übermittelt.");
    }
    const data = await file.toBuffer();
    if (file.file.truncated) {
      throw new BadRequestException("Die Datei ist zu groß.");
    }
    try {
      const item = await uploadMedia(this.db, {
        storageDir: mediaDir(),
        originalName: file.filename,
        data,
        uploadedBy: request.userId,
      });
      return withUrl(item, request);
    } catch (error) {
      if (error instanceof MediaValidationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() request: FastifyRequest) {
    const parsed = updateMediaSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((issue) => issue.message).join(", "));
    }
    const item = await updateMediaAltText(this.db, id, parsed.data.altText);
    if (!item) {
      throw new NotFoundException("Medium nicht gefunden.");
    }
    return withUrl(item, request);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    const item = await deleteMedia(this.db, mediaDir(), id);
    if (!item) {
      throw new NotFoundException("Medium nicht gefunden.");
    }
    return { success: true };
  }
}

/**
 * Ausgeliefert werden Dateien öffentlich — Bilder in veröffentlichten
 * Seiten müssen ohne Login sichtbar sein. Der Dateiname ist eine UUID und
 * wird streng geprüft, damit kein Pfad außerhalb des Medienordners
 * erreichbar ist.
 */
@Controller("media/files")
export class PublicMediaController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get(":storedName")
  async file(
    @Param("storedName") storedName: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (!isValidStoredName(storedName)) {
      throw new NotFoundException("Datei nicht gefunden.");
    }
    const item = await getMediaByStoredName(this.db, storedName);
    if (!item) {
      throw new NotFoundException("Datei nicht gefunden.");
    }
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    reply.header("X-Content-Type-Options", "nosniff");
    // Admin (anderer Origin) und öffentliche Seite binden die Bilder ein.
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    return new StreamableFile(createReadStream(resolveStoredPath(mediaDir(), storedName)), {
      type: item.mimeType,
    });
  }
}
