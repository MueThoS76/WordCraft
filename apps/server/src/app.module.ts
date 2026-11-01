import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { BootstrapModule } from "./bootstrap/bootstrap.module.js";
import { ContentModule } from "./content/content.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
  imports: [DatabaseModule, HealthModule, BootstrapModule, AuthModule, ContentModule],
})
export class AppModule {}
