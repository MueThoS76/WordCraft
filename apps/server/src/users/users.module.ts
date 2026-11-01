import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { CapabilitiesController } from "./capabilities.controller.js";
import { GroupsController } from "./groups.controller.js";
import { UsersController } from "./users.controller.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [GroupsController, CapabilitiesController, UsersController],
})
export class UsersModule {}
