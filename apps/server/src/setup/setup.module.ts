import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { SetupController } from "./setup.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [SetupController],
})
export class SetupModule {}
