// backfill-article-images.mjs
// Fills articles.image_url from the article page's og:image / twitter:image
// when the feed never carried artwork (BleepingComputer breaking rows, etc.).
//
// Run with: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node backfill-article-images.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_AGENT =
  process.env.BREAKING_USER_AGENT ||
  'Mozilla/5.0 (compatible; CyberSimplyBot/1.0; +https://cybersimply.app)';
const LIMIT = Number(process.env.IMAGE_BACKFILL_LIMIT || 80);
const TIMEOUT_MS = 8_000;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

function toHttpsUrl(value, baseUrl) {
  const raw = String(value || '')
    .replace(/&amp;/gi, '&')
    .trim();
  if (!raw || raw.startsWith('data:')) return null;
  try {
    const parsed = new URL(raw, baseUrl);
    if (parsed.protocol === 'http:') parsed.protocol = 'https:';
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function fetchOgImage(pageUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(pageUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match =
      html.match(/property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)/i) ||
      html.match(/content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i) ||
      html.match(/name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)/i) ||
      html.match(/content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i);
    return match ? toHttpsUrl(match[1], pageUrl) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, source, source_url, redirect_url, image_url')
    .is('image_url', null)
    .order('published_at', { ascending: false })
    .limit(LIMIT);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  console.log(`🖼️ ${rows.length} articles missing image_url`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const page = row.redirect_url || row.source_url;
    if (!page) {
      skipped++;
      continue;
    }
    const image = await fetchOgImage(page);
    if (!image) {
      skipped++;
      continue;
    }
    const { error: updateError } = await supabase
      .from('articles')
      .update({ image_url: image })
      .eq('id', row.id);
    if (updateError) {
      console.warn(`⚠️ ${row.id}: ${updateError.message}`);
      skipped++;
      continue;
    }
    updated++;
    console.log(`   ✓ ${row.source} — ${image}`);
  }

  console.log(`✅ Backfill done. ${updated} updated, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
