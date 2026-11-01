import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { BootstrapService } from "./bootstrap.service.js";

@Module({
  imports: [DatabaseModule],
  providers: [BootstrapService],
})
export class BootstrapModule {}
