# CyberSimply — website

The cybersimply.com website. A Next.js (App Router) static export that reads the
**same Supabase `articles` table** the mobile app reads and the GitHub Actions
pipeline (`fetch-articles.mjs`) writes. No article data is duplicated here.

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export into out/
npx serve out    # preview the built site
```

Credentials default to the public Supabase project used by the app. Override
them with a `.env.local` if you need to point somewhere else:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Shared logic

These are deliberate ports of mobile utilities, kept in sync by hand so the site
and the app show the same copy:

| `web/lib`     | Mobile source                  | Purpose                                  |
| ------------- | ------------------------------ | ---------------------------------------- |
| `category.ts` | `src/utils/articleCategory.ts` | Derives the colour-coded tag             |
| `quality.ts`  | `src/utils/articleQuality.ts`  | Drops package releases and slug fragments |
| `text.ts`     | `src/utils/textUtils.ts`       | Repairs provider summary artifacts       |

Headline and summary length is capped with CSS `line-clamp`, never by slicing
the string — character budgets are what previously cut headlines mid-word.

## Deployment

`.github/workflows/deploy.yml` builds this app and publishes `web/out` to the
`gh-pages` branch with the `cybersimply.com` CNAME. It runs on pushes to `main`
and after each article pipeline run, so the statically-built feed stays current.

## Accounts

Visitors sign in with the **same Supabase accounts as the app** (email and
password, via `AuthProvider`). Sessions live in the browser, so no server is
needed. Signing in reads `user_profiles.ad_free` / `is_premium` and suppresses
every ad slot for entitled accounts, matching `AdFreeContext` in the app.

There is no saved-articles sync: the `user_favorites` table does not exist in
the project, and app favourites are device-local in AsyncStorage.

## Ads

`public/ads.txt` declares the AdSense publisher, and the loader is a plain async
`<script>` in the root layout, which React hoists into `<head>` of the
server-rendered HTML. Ads will not serve until Google approves the site.

In-feed units have no `data-ad-slot` yet; create them in the AdSense dashboard
and pass the ids to `<AdSlot slot="..." />`.
