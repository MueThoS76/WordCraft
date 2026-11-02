import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { DashboardController } from "./dashboard.controller.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
