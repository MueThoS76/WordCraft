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
import {
  addUserToGroup,
  createGroup,
  deleteGroup,
  getGroupById,
  grantCapabilityToGroup,
  listGroupCapabilities,
  listGroupMembers,
  listGroups,
  removeUserFromGroup,
  revokeCapabilityFromGroup,
  updateGroup,
} from "@presscraft/auth";
import type { Database } from "@presscraft/database";
import { z, ZodError } from "zod";
import { CapabilityGuard, RequireCapability } from "../auth/capability.guard.js";
import { CAPABILITY_USERS_MANAGE } from "../auth/core-capabilities.js";
import { SessionGuard } from "../auth/session.guard.js";
import { hasPgErrorCode } from "../common/pg-error.js";
import { DATABASE_CONNECTION } from "../database/database.module.js";
import {
  createGroupSchema,
  groupCapabilitySchema,
  groupMemberSchema,
  updateGroupSchema,
} from "./group.dto.js";

@Controller("groups")
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability(CAPABILITY_USERS_MANAGE)
export class GroupsController {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  @Get()
  list() {
    return listGroups(this.db);
  }

  @Post()
  async create(@Body() body: unknown) {
    const input = this.parse(createGroupSchema, body);
    try {
      return await createGroup(this.db, input);
    } catch (error) {
      if (hasPgErrorCode(error, "23505")) {
        throw new ConflictException("Gruppenname wird bereits verwendet.");
      }
      throw error;
    }
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const group = await getGroupById(this.db, id);
    if (!group) {
      throw new NotFoundException("Gruppe nicht gefunden.");
    }
    const [capabilities, members] = await Promise.all([
      listGroupCapabilities(this.db, id),
      listGroupMembers(this.db, id),
    ]);
    return { ...group, capabilities, members };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const input = this.parse(updateGroupSchema, body);
    let group;
    try {
      group = await updateGroup(this.db, id, input);
    } catch (error) {
      if (hasPgErrorCode(error, "23505")) {
        throw new ConflictException("Gruppenname wird bereits verwendet.");
      }
      throw error;
    }
    if (!group) {
      throw new NotFoundException("Gruppe nicht gefunden.");
    }
    return group;
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await deleteGroup(this.db, id);
    return { success: true };
  }

  @Post(":id/capabilities")
  async grantCapability(@Param("id") id: string, @Body() body: unknown) {
    const { capabilityId } = this.parse(groupCapabilitySchema, body);
    await grantCapabilityToGroup(this.db, id, capabilityId);
    return { success: true };
  }

  @Delete(":id/capabilities/:capabilityId")
  async revokeCapability(@Param("id") id: string, @Param("capabilityId") capabilityId: string) {
    await revokeCapabilityFromGroup(this.db, id, capabilityId);
    return { success: true };
  }

  @Post(":id/users")
  async addMember(@Param("id") id: string, @Body() body: unknown) {
    const { userId } = this.parse(groupMemberSchema, body);
    await addUserToGroup(this.db, userId, id);
    return { success: true };
  }

  @Delete(":id/users/:userId")
  async removeMember(@Param("id") id: string, @Param("userId") userId: string) {
    await removeUserFromGroup(this.db, userId, id);
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
