import { Controller, Get, Inject, NotFoundException, Param } from "@nestjs/common";
import { getCategoriesForItems, getPublishedContentItem } from "@presscraft/content";
import type { Database } from "@presscraft/database";
import { DATABASE_CONNECTION } from "../database/database.module.js";

/**
 * Öffentliche, unauthentifizierte Route (ADR 0014): liefert ausschließlich
 * den veröffentlichten Stand, nie einen Entwurf.
 */
@Controller("public/content/:typeId/:slug")
export class PublicContentController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  async get(@Param("typeId") typeId: string, @Param("slug") slug: string) {
    const item = await getPublishedContentItem(this.db, typeId, slug);
    if (!item) {
      throw new NotFoundException("Seite nicht gefunden.");
    }
    const categories = await getCategoriesForItems(this.db, [item.id]);
    return { ...item, categories: categories.get(item.id) ?? [] };
  }
}
