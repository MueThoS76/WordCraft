import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { BootstrapModule } from "./bootstrap/bootstrap.module.js";
import { ContentModule } from "./content/content.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthModule } from "./health/health.module.js";
import { MediaModule } from "./media/media.module.js";
import { SetupModule } from "./setup/setup.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    BootstrapModule,
    AuthModule,
    ContentModule,
    UsersModule,
    MediaModule,
    DashboardModule,
    SettingsModule,
    SetupModule,
  ],
})
export class AppModule {}
