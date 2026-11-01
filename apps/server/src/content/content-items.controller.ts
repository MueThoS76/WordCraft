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
  UseGuards,
} from "@nestjs/common";
import {
  createContentItem,
  deleteContentItem,
  getContentItem,
  listContentItems,
  publishContentItem,
  unpublishContentItem,
  updateContentItem,
} from "@presscraft/content";
import type { Database } from "@presscraft/database";
import { z, ZodError } from "zod";
import { CapabilityGuard, RequireCapability } from "../auth/capability.guard.js";
import { CAPABILITY_CONTENT_MANAGE } from "../auth/core-capabilities.js";
import type { AuthenticatedRequest } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import { createContentItemSchema, updateContentItemSchema } from "./content-item.dto.js";

@Controller("content/:typeId")
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability(CAPABILITY_CONTENT_MANAGE)
export class ContentItemsController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  list(@Param("typeId") typeId: string) {
    return listContentItems(this.db, typeId);
  }

  @Post()
  create(
    @Param("typeId") typeId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const input = this.parse(createContentItemSchema, body);
    return createContentItem(this.db, {
      contentTypeId: typeId,
      authorId: request.userId,
      ...input,
    });
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const item = await getContentItem(this.db, id);
    if (!item) {
      throw new NotFoundException("Content-Item nicht gefunden.");
    }
    return item;
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const input = this.parse(updateContentItemSchema, body);
    const item = await updateContentItem(this.db, id, input);
    if (!item) {
      throw new NotFoundException("Content-Item nicht gefunden.");
    }
    return item;
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await deleteContentItem(this.db, id);
    return { success: true };
  }

  @Post(":id/publish")
  async publish(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    const item = await publishContentItem(this.db, id, request.userId);
    if (!item) {
      throw new NotFoundException("Content-Item nicht gefunden.");
    }
    return item;
  }

  @Post(":id/unpublish")
  async unpublish(@Param("id") id: string) {
    const item = await unpublishContentItem(this.db, id);
    if (!item) {
      throw new NotFoundException("Content-Item nicht gefunden.");
    }
    return item;
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
