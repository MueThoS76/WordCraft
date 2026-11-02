import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PublicSettingsController, SettingsController } from "./settings.controller.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SettingsController, PublicSettingsController],
})
export class SettingsModule {}
