# CyberSimply — website

The cybersimply.com website. A Next.js (App Router) site that reads the
**same Supabase `articles` table** the mobile app reads and the GitHub Actions
pipeline (`fetch-articles.mjs`) writes. No article data is duplicated here.

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # preview the built site
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

Hosted on Vercel (project `cybersimply`), built from this directory — the
project's Root Directory is `web`. Pushes to `main` deploy to production and
every other branch gets a preview URL, so no deploy workflow lives in this repo.

Pages are incrementally regenerated every 10 minutes (`export const revalidate`
in `app/page.tsx` and `app/article/[id]/page.tsx`), so new articles appear
without a rebuild being triggered by the article pipeline.

## Accounts

Visitors sign in with the **same Supabase accounts as the app** (email and
password, via `AuthProvider`). Sessions live in the browser, so no server is
needed. Signing in reads `user_profiles.ad_free` / `is_premium` and suppresses
every ad slot for entitled accounts, matching `AdFreeContext` in the app.

There is no saved-articles sync: the `user_favorites` table does not exist in
the project, and app favourites are device-local in AsyncStorage.

## Ads

Websites cannot host AdMob units. The site uses **Google AdSense** on the same
publisher account as the mobile AdMob app (`pub-1846982089045102`).

- `public/ads.txt` and `public/app-ads.txt` declare the seller.
- The AdSense loader is a plain async `<script>` in the root layout, plus a
  `google-adsense-account` meta tag for site verification.
- Auto ads (page-level placements) are enabled in `AutoAds`. Ads start serving
  once the site is approved in AdSense and Auto ads are turned on for
  cybersimply.com.
- Optional in-feed / article units: create them in AdSense → Ads → By ad unit,
  then set `NEXT_PUBLIC_ADSENSE_SLOT_INFEED` and `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE`
  on the Vercel project. `<AdSlot slot="..." />` stays collapsed until those
  ids exist so empty boxes never sit in the feed.
