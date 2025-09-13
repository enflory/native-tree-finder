import { users, treeSpecies, type User, type InsertUser, type TreeSpecies, type InsertTreeSpecies } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTreeSpeciesByLocation(city: string, state: string): Promise<TreeSpecies[]>;
  createTreeSpecies(species: InsertTreeSpecies): Promise<TreeSpecies>;
  getTreeSpeciesByExternalId(externalId: string): Promise<TreeSpecies | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getTreeSpeciesByLocation(city: string, state: string): Promise<TreeSpecies[]> {
    return await db
      .select()
      .from(treeSpecies)
      .where(
        and(
          eq(treeSpecies.city, city),
          eq(treeSpecies.state, state)
        )
      );
  }

  async createTreeSpecies(insertSpecies: InsertTreeSpecies): Promise<TreeSpecies> {
    const [species] = await db
      .insert(treeSpecies)
      .values(insertSpecies)
      .returning();
    return species;
  }

  async getTreeSpeciesByExternalId(externalId: string): Promise<TreeSpecies | undefined> {
    const [species] = await db
      .select()
      .from(treeSpecies)
      .where(eq(treeSpecies.externalId, externalId));
    return species || undefined;
  }
}

export const storage = new DatabaseStorage();
