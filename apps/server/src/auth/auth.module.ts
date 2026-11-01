import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AuthController } from "./auth.controller.js";
import { CapabilityGuard } from "./capability.guard.js";
import { SessionGuard } from "./session.guard.js";
import { TwoFactorController } from "./two-factor.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, TwoFactorController],
  providers: [SessionGuard, CapabilityGuard],
  exports: [SessionGuard, CapabilityGuard],
})
export class AuthModule {}
