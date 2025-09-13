import { type User, type InsertUser, type TreeSpecies, type InsertTreeSpecies } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTreeSpeciesByLocation(city: string, state: string): Promise<TreeSpecies[]>;
  createTreeSpecies(species: InsertTreeSpecies): Promise<TreeSpecies>;
  getTreeSpeciesByExternalId(externalId: string): Promise<TreeSpecies | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private treeSpecies: Map<string, TreeSpecies>;

  constructor() {
    this.users = new Map();
    this.treeSpecies = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTreeSpeciesByLocation(city: string, state: string): Promise<TreeSpecies[]> {
    return Array.from(this.treeSpecies.values()).filter(
      (species) => species.city.toLowerCase() === city.toLowerCase() && 
                   species.state.toLowerCase() === state.toLowerCase()
    );
  }

  async createTreeSpecies(insertSpecies: InsertTreeSpecies): Promise<TreeSpecies> {
    const id = randomUUID();
    const species: TreeSpecies = { 
      ...insertSpecies, 
      id,
      imageUrl: insertSpecies.imageUrl ?? null,
      maxHeight: insertSpecies.maxHeight ?? null,
      maxAge: insertSpecies.maxAge ?? null,
      externalId: insertSpecies.externalId ?? null
    };
    this.treeSpecies.set(id, species);
    return species;
  }

  async getTreeSpeciesByExternalId(externalId: string): Promise<TreeSpecies | undefined> {
    return Array.from(this.treeSpecies.values()).find(
      (species) => species.externalId === externalId
    );
  }
}

export const storage = new MemStorage();
