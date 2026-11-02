import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { CategoriesController, PublicListingController } from "./categories.controller.js";
import { ContentItemsController } from "./content-items.controller.js";
import { ContentTypesController } from "./content-types.controller.js";
import { PublicContentController } from "./public-content.controller.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    ContentItemsController,
    ContentTypesController,
    PublicContentController,
    CategoriesController,
    PublicListingController,
  ],
})
export class ContentModule {}
