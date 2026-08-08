import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: 'C:/Users/ASUS/.gemini/antigravity/scratch/DiDesa/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing update on Supabase...");
  const { data, error } = await supabase.from("residents").update({ status: 'archived' }).eq("nik", "6306060107140005").select();
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
