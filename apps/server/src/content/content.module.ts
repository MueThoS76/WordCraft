import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { ContentItemsController } from "./content-items.controller.js";
import { ContentTypesController } from "./content-types.controller.js";
import { PublicContentController } from "./public-content.controller.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ContentItemsController, ContentTypesController, PublicContentController],
})
export class ContentModule {}
