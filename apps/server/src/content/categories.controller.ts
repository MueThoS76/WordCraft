import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  createCategory,
  deleteCategory,
  listCategoriesWithCounts,
  listPublicCategories,
  listPublishedSlugs,
  listPublishedItems,
  updateCategory,
} from "@presscraft/content";
import type { Database } from "@presscraft/database";
import { z } from "zod";
import { CapabilityGuard, RequireCapability } from "../auth/capability.guard.js";
import { CAPABILITY_CONTENT_MANAGE } from "../auth/core-capabilities.js";
import { SessionGuard } from "../auth/session.guard.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import { hasPgErrorCode } from "../common/pg-error.js";

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().max(100).optional(),
  description: z.string().max(500).optional(),
});
const updateCategorySchema = createCategorySchema.partial();

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(result.error.issues.map((issue) => issue.message).join(", "));
  }
  return result.data;
}

@Controller("categories")
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability(CAPABILITY_CONTENT_MANAGE)
export class CategoriesController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  list() {
    return listCategoriesWithCounts(this.db);
  }

  @Post()
  async create(@Body() body: unknown) {
    const input = parse(createCategorySchema, body);
    try {
      return await createCategory(this.db, input);
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const input = parse(updateCategorySchema, body);
    try {
      const category = await updateCategory(this.db, id, input);
      if (!category) {
        throw new NotFoundException("Kategorie nicht gefunden.");
      }
      return category;
    } catch (error) {
      throw this.translate(error);
    }
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await deleteCategory(this.db, id);
    return { success: true };
  }

  private translate(error: unknown): unknown {
    if (hasPgErrorCode(error, "23505")) {
      return new ConflictException("Eine Kategorie mit diesem Slug existiert bereits.");
    }
    return error;
  }
}

/**
 * Öffentliche, unauthentifizierte Listen für das Frontend (ADR 0014):
 * ausschließlich veröffentlichte Beiträge.
 */
@Controller("public")
export class PublicListingController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get("posts")
  posts(
    @Query("category") category?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return listPublishedItems(this.db, {
      contentTypeId: "post",
      categorySlug: category || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("categories")
  categories() {
    return listPublicCategories(this.db, "post");
  }

  /** Alles, was die Sitemap braucht — nur Veröffentlichtes. */
  @Get("sitemap")
  async sitemap() {
    const [pages, posts, categories] = await Promise.all([
      listPublishedSlugs(this.db, "page"),
      listPublishedSlugs(this.db, "post"),
      listPublicCategories(this.db, "post"),
    ]);
    return { pages, posts, categories: categories.map((category) => ({ slug: category.slug })) };
  }
}
