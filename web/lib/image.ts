const USER_AGENT =
  'Mozilla/5.0 (compatible; CyberSimplyBot/1.0; +https://cybersimply.app)';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_RECOVERIES = 16;

/** In-process cache so ISR rebuilds in the same instance don't re-scrape. */
const recovered = new Map<string, string | null>();

function toHttpsUrl(value: string, baseUrl?: string): string | null {
  const raw = value.replace(/&amp;/gi, '&').trim();
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

/**
 * Publisher RSS/NewsAPI rows often arrive with a null `image_url`. BleepingComputer
 * in particular never puts a photo in the feed — the artwork is only `og:image`
 * on the article page. Used at read time so the site does not wait on a DB
 * backfill that the anon key cannot perform.
 */
export async function fetchOgImage(pageUrl: string): Promise<string | null> {
  if (recovered.has(pageUrl)) return recovered.get(pageUrl) ?? null;

  try {
    const response = await fetch(pageUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) {
      recovered.set(pageUrl, null);
      return null;
    }

    const html = await response.text();
    const match =
      html.match(/property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)/i) ||
      html.match(/content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i) ||
      html.match(/name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)/i) ||
      html.match(/content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i);

    const image = match ? toHttpsUrl(match[1], pageUrl) : null;
    recovered.set(pageUrl, image);
    return image;
  } catch {
    recovered.set(pageUrl, null);
    return null;
  }
}

export async function fillMissingImages<T extends { image_url: string | null; redirect_url: string | null; source_url?: string | null }>(
  articles: T[],
): Promise<T[]> {
  const missing = articles.filter((article) => {
    if (article.image_url) return false;
    const page = article.redirect_url || article.source_url;
    return Boolean(page && page.startsWith('http'));
  });

  if (missing.length === 0) return articles;

  const recoveredByPage = new Map<string, string>();
  await Promise.all(
    missing.slice(0, MAX_RECOVERIES).map(async (article) => {
      const page = (article.redirect_url || article.source_url)!;
      const image = await fetchOgImage(page);
      if (image) recoveredByPage.set(page, image);
    }),
  );

  if (recoveredByPage.size === 0) return articles;

  return articles.map((article) => {
    if (article.image_url) return article;
    const page = article.redirect_url || article.source_url;
    const image = page ? recoveredByPage.get(page) : undefined;
    return image ? { ...article, image_url: image } : article;
  });
}
