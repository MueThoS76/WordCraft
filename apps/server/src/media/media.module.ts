import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { MediaController, PublicMediaController } from "./media.controller.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MediaController, PublicMediaController],
})
export class MediaModule {}
