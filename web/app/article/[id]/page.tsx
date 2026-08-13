import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleThumb } from '@/components/ArticleThumb';
import { CategoryTag } from '@/components/CategoryTag';
import { AiSparkle } from '@/components/AiSparkle';
import { AdSlot } from '@/components/AdSlot';
import { getArticleById, getFeedArticles } from '@/lib/articles';
import { getArticleCategory } from '@/lib/category';
import { fullDate } from '@/lib/date';
import { formatSource, parseBullets } from '@/lib/text';

export const revalidate = 600;

/**
 * Pre-renders the articles the feed links to at build time. Ids outside that
 * set are rendered on demand and cached, which keeps older articles and ones
 * published since the last build reachable; genuinely missing ids still 404.
 */
export async function generateStaticParams() {
  const articles = await getFeedArticles();
  return articles.map((article) => ({ id: article.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) return { title: 'Article not found' };

  return {
    title: article.title,
    description: article.cleanSummary || undefined,
    openGraph: {
      title: article.title,
      description: article.cleanSummary || undefined,
      images: article.image_url ? [article.image_url] : undefined,
      type: 'article',
      publishedTime: article.published_at,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) notFound();

  const category = getArticleCategory(article);

  const sections = [
    { heading: 'What happened', body: article.what },
    { heading: 'Why it matters', body: article.why_this_matters },
    { heading: 'Impact', body: article.impact },
    { heading: 'What you can do', body: article.takeaways },
  ].filter((section) => {
    const text = section.body?.trim();
    return Boolean(text) && text!.toUpperCase() !== 'N/A';
  });

  return (
    <article className="mx-auto max-w-3xl px-4 pb-4 pt-8 sm:px-6 sm:pt-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-[14px] font-medium text-neutral-500 transition-colors hover:text-[#ff7613] dark:text-neutral-400"
      >
        <span aria-hidden="true">←</span> All stories
      </Link>

      <header className="mb-6">
        <CategoryTag category={category} />

        <h1 className="mt-3 text-balance text-3xl font-bold leading-[1.15] tracking-[-0.025em] sm:text-[42px]">
          {article.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[14px] text-neutral-500 dark:text-neutral-400">
          {/* Capped by the layout width, not a character budget. */}
          <span className="max-w-full truncate font-medium">
            {article.author?.trim() || formatSource(article.source)}
          </span>
          {article.hasAiSummary && (
            <>
              <AiSparkle />
              <span>simplified with AI</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <time dateTime={article.published_at}>{fullDate(article.published_at)}</time>
        </div>
      </header>

      <ArticleThumb
        src={article.image_url}
        alt=""
        categoryKind={category.kind}
        className="mb-8 aspect-[16/9] rounded-2xl"
      />

      {article.cleanSummary && (
        <p className="mb-8 border-l-[3px] border-[#ff7613] pl-4 text-[19px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          {article.cleanSummary}
        </p>
      )}

      {sections.length > 0 && (
        <div className="space-y-7">
          {sections.map((section) => {
            const body = section.body!.trim();
            const bullets = parseBullets(body);

            return (
              <section key={section.heading}>
                <h2 className="mb-2 text-[13px] font-bold uppercase tracking-widest text-neutral-400">
                  {section.heading}
                </h2>
                {bullets ? (
                  <ul className="space-y-2 text-[17px] leading-[1.7] text-neutral-800 dark:text-neutral-200">
                    {bullets.map((item, index) => (
                      <li key={index} className="flex gap-2.5">
                        <span aria-hidden="true" className="mt-[2px] text-[#ff7613]">
                          •
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="whitespace-pre-line text-[17px] leading-[1.7] text-neutral-800 dark:text-neutral-200">
                    {body}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <AdSlot className="my-10" />

      {article.redirect_url && (
        <a
          href={article.redirect_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#ff7613] px-5 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Read the full story at {formatSource(article.source)}
          <span aria-hidden="true">→</span>
        </a>
      )}
    </article>
  );
}
