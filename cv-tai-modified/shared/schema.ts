import { pgTable, text, integer, timestamp, date, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

// Custom vector type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    if (typeof value === "string") {
      return JSON.parse(value);
    }
    return value as number[];
  },
});

export const experiences = pgTable("experiences", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  description: text("description"),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bullets = pgTable("bullets", {
  id: uuid("id").primaryKey().defaultRandom(),
  experienceId: uuid("experience_id").references(() => experiences.id).notNull(),
  text: text("text").notNull(),
  priority: integer("priority").default(0),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").unique().notNull(),
  category: text("category"),
  level: integer("level"),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobPosts = pgTable("job_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url"),
  rawText: text("raw_text"),
  extractedJson: jsonb("extracted_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobPostId: uuid("job_post_id").references(() => jobPosts.id).notNull(),
  mode: text("mode").notNull(), // "safe" | "ats"
  selectedExperienceIds: uuid("selected_experience_ids").array(),
  selectedBulletIds: uuid("selected_bullet_ids").array(),
  outputCvText: text("output_cv_text"),
  outputReportJson: jsonb("output_report_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExperienceSchema = createInsertSchema(experiences).omit({ id: true, createdAt: true });
export const insertBulletSchema = createInsertSchema(bullets).omit({ id: true, createdAt: true });
export const insertSkillSchema = createInsertSchema(skills).omit({ id: true, createdAt: true });
export const insertJobPostSchema = createInsertSchema(jobPosts).omit({ id: true, createdAt: true });
export const insertRunSchema = createInsertSchema(runs).omit({ id: true, createdAt: true });

export type Experience = typeof experiences.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;

export type Bullet = typeof bullets.$inferSelect;
export type InsertBullet = z.infer<typeof insertBulletSchema>;

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;

export type JobPost = typeof jobPosts.$inferSelect;
export type InsertJobPost = z.infer<typeof insertJobPostSchema>;

export type Run = typeof runs.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;

export type RunResponse = Run & {
  jobPost: JobPost;
};
