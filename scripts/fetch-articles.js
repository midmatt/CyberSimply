import { createClient } from "@supabase/supabase-js";

console.log("🤖 Using Supabase summaries — no OpenAI API key needed in client.");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase URL or Anon Key is missing. Cannot fetch summaries.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getArticleSummary(articleId) {
  const { data, error } = await supabase
    .from("articles")
    .select("summary, impact, key_takeaways")
    .eq("id", articleId)
    .single();

  if (error) {
    console.error("Error fetching summary from Supabase:", error);
    return null;
  }

  return data;
}
