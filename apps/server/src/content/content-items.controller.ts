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
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  createContentItem,
  getCategoriesForItems,
  getRevision,
  listRevisions,
  restoreRevision,
  saveContentItem,
  setItemCategories,
  deleteContentItem,
  getContentItem,
  listContentItems,
  publishContentItem,
  unpublishContentItem,
} from "@presscraft/content";
import {
  createCoreBlockRegistry,
  UnknownBlockTypeError,
  validateBlockDocument,
} from "@presscraft/blocks";
import type { Database } from "@presscraft/database";
import { z, ZodError } from "zod";
import { CapabilityGuard, RequireCapability } from "../auth/capability.guard.js";
import { CAPABILITY_CONTENT_MANAGE } from "../auth/core-capabilities.js";
import type { AuthenticatedRequest } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import {
  createContentItemSchema,
  setCategoriesSchema,
  updateContentItemSchema,
} from "./content-item.dto.js";

const blockRegistry = createCoreBlockRegistry();

@Controller("content/:typeId")
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability(CAPABILITY_CONTENT_MANAGE)
export class ContentItemsController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  async list(@Param("typeId") typeId: string) {
    const items = await listContentItems(this.db, typeId);
    const categories = await getCategoriesForItems(
      this.db,
      items.map((item) => item.id),
    );
    return items.map((item) => ({ ...item, categories: categories.get(item.id) ?? [] }));
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
    const categories = await getCategoriesForItems(this.db, [item.id]);
    return { ...item, categories: categories.get(item.id) ?? [] };
  }

  /** Ersetzt die Kategorien eines Items vollständig. */
  @Put(":id/categories")
  async setCategories(@Param("id") id: string, @Body() body: unknown) {
    const { categoryIds } = this.parse(setCategoriesSchema, body);
    const item = await getContentItem(this.db, id);
    if (!item) {
      throw new NotFoundException("Content-Item nicht gefunden.");
    }
    return { categories: await setItemCategories(this.db, id, categoryIds) };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const input = this.parse(updateContentItemSchema, body);
    this.validateBlocks(input.blockBody);
    const item = await saveContentItem(this.db, id, input, request.userId);
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

  @Get(":id/revisions")
  async revisions(@Param("id") id: string) {
    return listRevisions(this.db, id);
  }

  @Get(":id/revisions/:revisionId")
  async revision(@Param("id") id: string, @Param("revisionId") revisionId: string) {
    const revision = await getRevision(this.db, id, revisionId);
    if (!revision) {
      throw new NotFoundException("Revision nicht gefunden.");
    }
    return revision;
  }

  /** Stellt eine Revision als neuen Entwurf wieder her (Veröffentlichtes bleibt unberührt). */
  @Post(":id/revisions/:revisionId/restore")
  async restore(
    @Param("id") id: string,
    @Param("revisionId") revisionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const item = await restoreRevision(this.db, id, revisionId, request.userId);
    if (!item) {
      throw new NotFoundException("Revision nicht gefunden.");
    }
    const categories = await getCategoriesForItems(this.db, [item.id]);
    return { ...item, categories: categories.get(item.id) ?? [] };
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

  /**
   * Prüft jeden Block gegen das Attribut-Schema seines Typs (ADR 0014), nicht
   * nur die Dokumentstruktur — sonst könnten z. B. unsichere Link-Ziele
   * über die API gespeichert werden.
   */
  private validateBlocks(blockBody: unknown): void {
    if (blockBody === undefined) {
      return;
    }
    try {
      validateBlockDocument(blockBody, blockRegistry);
    } catch (error) {
      if (error instanceof UnknownBlockTypeError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof ZodError) {
        throw new BadRequestException(
          "Ungültiger Block: " +
            error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join(", "),
        );
      }
      throw error;
    }
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
