/**
 * One-off fix: rehash passwords with the correct format used by auth.ts (salt:hash)
 * Run: DATABASE_URL=... npx tsx server/fix-passwords.ts
 */
import { pool } from "./db";
import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);

// Same format as auth.ts
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

async function main() {
  const client = await pool.connect();
  try {
    // Fix theo's password
    const hash1 = await hashPassword("PaulinGradin");
    await client.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2",
      [hash1, "theo.pornin@gmail.com"]
    );
    console.log("✅ theo.pornin@gmail.com — password fixed");

    // Fix marie's password
    const hash2 = await hashPassword("TestUser123");
    await client.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2",
      [hash2, "marie.leclerc.test@gmail.com"]
    );
    console.log("✅ marie.leclerc.test@gmail.com — password fixed");

  } finally {
    client.release();
    await pool.end();
  }
}

main();
