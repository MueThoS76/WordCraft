import { eq, users, type Database } from "@presscraft/database";
import { hashPassword } from "./password.js";

export interface CreateUserInput {
  email: string;
  password: string;
}

export async function createUser(db: Database, input: CreateUserInput) {
  const passwordHash = await hashPassword(input.password);
  const [user] = await db.insert(users).values({ email: input.email, passwordHash }).returning();
  return user;
}

export async function getUserByEmail(db: Database, email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}
