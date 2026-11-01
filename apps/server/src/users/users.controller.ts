import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { createUser, deleteUser, getUserById, listUsers, updateUser } from "@presscraft/auth";
import type { Database } from "@presscraft/database";
import { z, ZodError } from "zod";
import { CapabilityGuard, RequireCapability } from "../auth/capability.guard.js";
import { CAPABILITY_USERS_MANAGE } from "../auth/core-capabilities.js";
import { SessionGuard } from "../auth/session.guard.js";
import { hasPgErrorCode } from "../common/pg-error.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import { createUserSchema, updateUserSchema } from "./user.dto.js";

@Controller("users")
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability(CAPABILITY_USERS_MANAGE)
export class UsersController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  list() {
    return listUsers(this.db);
  }

  @Post()
  async create(@Body() body: unknown) {
    const input = this.parse(createUserSchema, body);
    try {
      return await createUser(this.db, input);
    } catch (error) {
      if (hasPgErrorCode(error, "23505")) {
        throw new ConflictException("E-Mail-Adresse wird bereits verwendet.");
      }
      throw error;
    }
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const user = await getUserById(this.db, id);
    if (!user) {
      throw new NotFoundException("User nicht gefunden.");
    }
    return user;
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const input = this.parse(updateUserSchema, body);
    try {
      const user = await updateUser(this.db, id, input);
      if (!user) {
        throw new NotFoundException("User nicht gefunden.");
      }
      return user;
    } catch (error) {
      if (hasPgErrorCode(error, "23505")) {
        throw new ConflictException("E-Mail-Adresse wird bereits verwendet.");
      }
      throw error;
    }
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    try {
      await deleteUser(this.db, id);
    } catch (error) {
      if (hasPgErrorCode(error, "23503")) {
        throw new ConflictException("User kann nicht gelöscht werden, da er noch Inhalte besitzt.");
      }
      throw error;
    }
    return { success: true };
  }

  private parse<T>(schema: z.ZodType<T>, body: unknown): T {
    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(error.issues.map((issue) => issue.message).join(", "));
      }
      throw error;
    }
  }
}
