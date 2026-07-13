import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const rawUrl = 'postgresql://postgres:Eme/H/252*l6@db.rmrctorxzprrmshorcut.supabase.co:5432/postgres';
  
  // Replace the unencoded password with the encoded one
  const encodedUrl = 'postgresql://postgres:Eme%2FH%2F252*l6@db.rmrctorxzprrmshorcut.supabase.co:5432/postgres';
  
  console.log("Raw URL:", rawUrl);
  console.log("Encoded URL:", encodedUrl);
  
  const pool = new Pool({
    connectionString: encodedUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await pool.query("SELECT 1");
    console.log("Connected successfully using encoded URL!");
  } catch(e) {
    console.error("Error connecting with encoded URL:", e.message);
  } finally {
    pool.end();
  }
}
test();
