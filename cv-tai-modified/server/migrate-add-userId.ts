/**
 * One-time migration script: add user_id columns to all tables and seed an admin user.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpassword npx tsx server/migrate-add-userId.ts
 *
 * Safe to run multiple times (idempotent).
 */

import { pool } from "./db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function columnExists(client: any, table: string, column: string): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return result.rows.length > 0;
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD env vars are required.");
    console.error("   Example: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret npx tsx server/migrate-add-userId.ts");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // --- 1. Create admin user if none exists ---
    const existingUsers = await client.query("SELECT id FROM users LIMIT 1");
    let adminUserId: number;

    if (existingUsers.rows.length === 0) {
      console.log(`Creating admin user: ${adminEmail}`);
      const hash = await hashPassword(adminPassword);
      const result = await client.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
        [adminEmail, hash]
      );
      adminUserId = result.rows[0].id;
      console.log(`✅ Admin user created with id=${adminUserId}`);
    } else {
      adminUserId = existingUsers.rows[0].id;
      console.log(`ℹ️  Existing user found with id=${adminUserId} — using as owner of existing data`);
    }

    // --- 2. Tables that need user_id ---
    const tables = ["profile", "experiences", "skills", "formations", "languages", "job_posts", "runs"];

    for (const table of tables) {
      const exists = await columnExists(client, table, "user_id");
      if (exists) {
        console.log(`  ⏭️  ${table}.user_id already exists — skipping`);
        continue;
      }

      // Add nullable column
      console.log(`  ➕ ${table}: adding user_id column...`);
      await client.query(
        `ALTER TABLE ${table} ADD COLUMN user_id integer REFERENCES users(id)`
      );

      // Assign all existing rows to admin
      await client.query(`UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`, [adminUserId]);
      console.log(`  ✍️  ${table}: existing rows attributed to user ${adminUserId}`);

      // Set NOT NULL
      await client.query(`ALTER TABLE ${table} ALTER COLUMN user_id SET NOT NULL`);

      // Create index for performance
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_${table.replace("-", "_")}_user_id ON ${table}(user_id)`
      );

      console.log(`  ✅ ${table}: done`);
    }

    // --- 3. Fix skills unique constraint: drop old (name) unique, add (user_id, name) unique ---
    const oldConstraint = await client.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE table_name = 'skills' AND constraint_name = 'skills_name_unique'`
    );
    if (oldConstraint.rows.length > 0) {
      await client.query("ALTER TABLE skills DROP CONSTRAINT skills_name_unique");
      console.log("  ✅ skills: dropped global name unique constraint");
    }

    const newConstraint = await client.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE table_name = 'skills' AND constraint_name = 'skills_user_id_name_unique'`
    );
    if (newConstraint.rows.length === 0) {
      await client.query(
        "ALTER TABLE skills ADD CONSTRAINT skills_user_id_name_unique UNIQUE (user_id, name)"
      );
      console.log("  ✅ skills: added composite (user_id, name) unique constraint");
    }

    // --- 4. Profile: add unique constraint on user_id (1 profile per user) ---
    const profileConstraint = await client.query(
      `SELECT 1 FROM information_schema.table_constraints
       WHERE table_name = 'profile' AND constraint_name = 'profile_user_id_unique'`
    );
    if (profileConstraint.rows.length === 0) {
      await client.query(
        "ALTER TABLE profile ADD CONSTRAINT profile_user_id_unique UNIQUE (user_id)"
      );
      console.log("  ✅ profile: added unique(user_id) constraint");
    }

    await client.query("COMMIT");
    console.log("\n🎉 Migration complete. You can now log in with:", adminEmail);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
