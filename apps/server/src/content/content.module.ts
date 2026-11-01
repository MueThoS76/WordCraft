import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ContentItemsController } from "./content-items.controller.js";
import { ContentTypesController } from "./content-types.controller.js";
import { PublicContentController } from "./public-content.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [ContentItemsController, ContentTypesController, PublicContentController],
})
export class ContentModule {}
