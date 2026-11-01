import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1),
  require2fa: z.boolean().optional(),
});
export type CreateGroupDto = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  require2fa: z.boolean().optional(),
});
export type UpdateGroupDto = z.infer<typeof updateGroupSchema>;

export const groupCapabilitySchema = z.object({
  capabilityId: z.string().min(1),
});

export const groupMemberSchema = z.object({
  userId: z.string().uuid(),
});
