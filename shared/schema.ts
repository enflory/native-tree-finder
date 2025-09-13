import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const treeSpecies = pgTable("tree_species", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  commonName: text("common_name").notNull(),
  scientificName: text("scientific_name").notNull(),
  imageUrl: text("image_url"),
  habitatDescription: text("habitat_description").notNull(),
  maxHeight: integer("max_height"), // in feet
  maxAge: integer("max_age"), // in years
  city: text("city").notNull(),
  state: text("state").notNull(),
  externalId: text("external_id"), // for API source tracking
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTreeSpeciesSchema = createInsertSchema(treeSpecies).omit({
  id: true,
});

export const searchLocationSchema = z.object({
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required").max(2, "State must be 2 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type TreeSpecies = typeof treeSpecies.$inferSelect;
export type InsertTreeSpecies = z.infer<typeof insertTreeSpeciesSchema>;
export type SearchLocation = z.infer<typeof searchLocationSchema>;
