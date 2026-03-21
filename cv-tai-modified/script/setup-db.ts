import pg from "pg";

const { Pool } = pg;

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL, skipping setup");
    return;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("Vector extension created successfully.");
  } catch (err) {
    console.error("Error creating vector extension:", err);
  } finally {
    await pool.end();
  }
}

setup();
