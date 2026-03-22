import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import {
  experiences, bullets, skills, jobPosts, runs,
  type Experience, type InsertExperience,
  type Bullet, type InsertBullet,
  type Skill, type InsertSkill,
  type JobPost, type InsertJobPost,
  type Run, type InsertRun,
  type RunResponse
} from "@shared/schema";

export interface IStorage {
  // Experiences
  getExperiences(): Promise<Experience[]>;
  getExperience(id: string): Promise<Experience | undefined>;
  createExperience(exp: InsertExperience): Promise<Experience>;
  updateExperience(id: string, updates: Partial<InsertExperience>): Promise<Experience>;
  deleteExperience(id: string): Promise<void>;

  // Bullets
  getBulletsByExperience(expId: string): Promise<Bullet[]>;
  createBullet(bullet: InsertBullet): Promise<Bullet>;
  updateBullet(id: string, updates: Partial<InsertBullet>): Promise<Bullet>;
  deleteBullet(id: string): Promise<void>;
  updateBulletEmbedding(id: string, embedding: number[]): Promise<void>;
  getAllBullets(): Promise<Bullet[]>;

  // Skills
  getSkills(): Promise<Skill[]>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  updateSkill(id: string, updates: Partial<InsertSkill>): Promise<Skill>;
  deleteSkill(id: string): Promise<void>;

  // Job Posts
  createJobPost(jobPost: InsertJobPost): Promise<JobPost>;

  // Runs
  createRun(run: InsertRun): Promise<Run>;
  getRun(id: string): Promise<RunResponse | undefined>;
  getRuns(): Promise<RunResponse[]>;
}

export class DatabaseStorage implements IStorage {
  async getExperiences() {
    return await db.select().from(experiences).orderBy(experiences.priority);
  }
  async getExperience(id: string) {
    const [exp] = await db.select().from(experiences).where(eq(experiences.id, id));
    return exp;
  }
  async createExperience(exp: InsertExperience) {
    const [created] = await db.insert(experiences).values(exp).returning();
    return created;
  }
  async updateExperience(id: string, updates: Partial<InsertExperience>) {
    const [updated] = await db.update(experiences).set(updates).where(eq(experiences.id, id)).returning();
    return updated;
  }
  async deleteExperience(id: string) {
    await db.delete(bullets).where(eq(bullets.experienceId, id));
    await db.delete(experiences).where(eq(experiences.id, id));
  }

  async getBulletsByExperience(expId: string) {
    return await db.select().from(bullets).where(eq(bullets.experienceId, expId)).orderBy(bullets.priority);
  }
  async createBullet(bullet: InsertBullet) {
    const [created] = await db.insert(bullets).values(bullet).returning();
    return created;
  }
  async updateBullet(id: string, updates: Partial<InsertBullet>) {
    const [updated] = await db.update(bullets).set(updates).where(eq(bullets.id, id)).returning();
    return updated;
  }
  async deleteBullet(id: string) {
    await db.delete(bullets).where(eq(bullets.id, id));
  }
  async updateBulletEmbedding(id: string, embedding: number[]) {
    // pgvector not available — embedding disabled
    return;
  }
  async getAllBullets() {
    return await db.select().from(bullets);
  }

  async getSkills() {
    return await db.select().from(skills).orderBy(skills.priority);
  }
  async createSkill(skill: InsertSkill) {
    const [created] = await db.insert(skills).values(skill).returning();
    return created;
  }
  async updateSkill(id: string, updates: Partial<InsertSkill>) {
    const [updated] = await db.update(skills).set(updates).where(eq(skills.id, id)).returning();
    return updated;
  }
  async deleteSkill(id: string) {
    await db.delete(skills).where(eq(skills.id, id));
  }

  async createJobPost(jobPost: InsertJobPost) {
    const [created] = await db.insert(jobPosts).values(jobPost).returning();
    return created;
  }

  async createRun(run: InsertRun) {
    const [created] = await db.insert(runs).values(run).returning();
    return created;
  }
  async getRun(id: string) {
    const [run] = await db.select().from(runs).where(eq(runs.id, id));
    if (!run) return undefined;
    const [jobPost] = await db.select().from(jobPosts).where(eq(jobPosts.id, run.jobPostId));
    return { ...run, jobPost };
  }
  async getRuns(): Promise<RunResponse[]> {
    const allRuns = await db.select().from(runs).orderBy(desc(runs.createdAt)).limit(50);
    const results: RunResponse[] = [];
    for (const run of allRuns) {
      const [jobPost] = await db.select().from(jobPosts).where(eq(jobPosts.id, run.jobPostId));
      if (jobPost) results.push({ ...run, jobPost });
    }
    return results;
  }
}

export const storage = new DatabaseStorage();
