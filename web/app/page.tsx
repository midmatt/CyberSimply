import { Fragment } from 'react';
import { ArticleCard } from '@/components/ArticleCard';
import { ArticleRow } from '@/components/ArticleRow';
import { AdSlot } from '@/components/AdSlot';
import { getFeedArticles } from '@/lib/articles';

/**
 * The feed is rebuilt at most once every 10 minutes. The article pipeline runs
 * far less often than that, so this keeps the homepage current without a
 * Supabase round trip on every request.
 */
export const revalidate = 600;

/** Stories stacked beside the lead card on desktop. */
const SECONDARY_COUNT = 4;

/**
 * Positions (in cards) where an in-feed ad is injected. Chosen so the first ad
 * sits below the fold on mobile and each lands on a row boundary of the
 * 3-column desktop grid, which keeps the card rhythm intact.
 */
const AD_AFTER_CARDS = [3, 12, 24];

export default async function HomePage() {
  const articles = await getFeedArticles();

  if (articles.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold">No stories right now</h1>
        <p className="mt-2 text-neutral-500">
          Check back shortly — the feed updates through the day.
        </p>
      </div>
    );
  }

  const [lead, ...remaining] = articles;
  const secondary = remaining.slice(0, SECONDARY_COUNT);
  const rest = remaining.slice(SECONDARY_COUNT);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-4 pt-8 sm:px-6 sm:pt-10">
      <h1 className="sr-only">Latest cybersecurity news</h1>

      {/*
        The lead card previously sat alone in a narrow column, which left half
        the desktop width empty. It now shares a row with the next few stories.
      */}
      <section className="mb-12 grid gap-x-8 gap-y-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeading title="Top story" />
          <ArticleCard article={lead} variant="lead" />
        </div>

        {secondary.length > 0 && (
          <aside className="lg:col-span-1">
            <SectionHeading title="More top stories" />
            <div className="divide-y divide-black/[0.06] border-t border-black/[0.06] dark:divide-white/10 dark:border-white/10">
              {secondary.map((article) => (
                <ArticleRow key={article.id} article={article} />
              ))}
            </div>
          </aside>
        )}
      </section>

      {rest.length > 0 && (
        <section>
          <SectionHeading title="Latest" count={rest.length} />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((article, index) => (
              <Fragment key={article.id}>
                {AD_AFTER_CARDS.includes(index) && (
                  // Spans the full row so neighbouring cards keep their widths
                  // instead of being pushed into an uneven column.
                  <AdSlot className="sm:col-span-2 lg:col-span-3" />
                )}
                <ArticleCard article={article} />
              </Fragment>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <h2 className="text-[22px] font-bold tracking-[-0.02em]">{title}</h2>
      {typeof count === 'number' && count > 0 && (
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[12px] font-semibold text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
          {count}
        </span>
      )}
    </div>
  );
}
