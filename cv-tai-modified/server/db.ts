import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Auto-create tables on startup if they don't exist
export async function ensureTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      
      CREATE TABLE IF NOT EXISTS experiences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        description TEXT,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bullets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        tags TEXT[] DEFAULT '{}',
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS skills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        level INTEGER,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS job_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url TEXT,
        raw_text TEXT,
        extracted_json JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_post_id UUID NOT NULL REFERENCES job_posts(id),
        mode TEXT NOT NULL,
        selected_experience_ids UUID[],
        selected_bullet_ids UUID[],
        output_cv_text TEXT,
        output_report_json JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[DB] Tables verified/created successfully");
  } catch (err: any) {
    // If vector extension fails, create tables without the embedding column
    if (err.message?.includes("vector")) {
      console.log("[DB] pgvector not available, creating tables without embedding...");
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        
        CREATE TABLE IF NOT EXISTS experiences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          company TEXT NOT NULL,
          start_date DATE,
          end_date DATE,
          description TEXT,
          priority INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS bullets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          experience_id UUID NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          priority INTEGER DEFAULT 0,
          tags TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS skills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT UNIQUE NOT NULL,
          level INTEGER,
          priority INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS job_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          url TEXT,
          raw_text TEXT,
          extracted_json JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_post_id UUID NOT NULL REFERENCES job_posts(id),
          mode TEXT NOT NULL,
          selected_experience_ids UUID[],
          selected_bullet_ids UUID[],
          output_cv_text TEXT,
          output_report_json JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log("[DB] Tables created without pgvector");
    } else {
      console.error("[DB] Failed to create tables:", err.message);
    }
  } finally {
    client.release();
  }
}
