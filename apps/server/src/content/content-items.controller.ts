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
import { SYSTEM_USER_ID } from "../bootstrap/bootstrap.service.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import { createContentItemSchema, updateContentItemSchema } from "./content-item.dto.js";

@Controller("content/:typeId")
export class ContentItemsController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  list(@Param("typeId") typeId: string) {
    return listContentItems(this.db, typeId);
  }

  @Post()
  create(@Param("typeId") typeId: string, @Body() body: unknown) {
    const input = this.parse(createContentItemSchema, body);
    // TODO: authorId kommt in Implementierungsschritt 7 aus dem eingeloggten
    // User, nicht mehr aus SYSTEM_USER_ID.
    return createContentItem(this.db, {
      contentTypeId: typeId,
      authorId: SYSTEM_USER_ID,
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
  async publish(@Param("id") id: string) {
    const item = await publishContentItem(this.db, id, SYSTEM_USER_ID);
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
