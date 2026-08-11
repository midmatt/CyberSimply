import Link from 'next/link';
import { CategoryTag } from './CategoryTag';
import { AiSparkle } from './AiSparkle';
import { ArticleThumb } from './ArticleThumb';
import { getArticleCategory } from '@/lib/category';
import { relativeTime } from '@/lib/date';
import { formatSource } from '@/lib/text';
import type { Article } from '@/lib/types';

interface ArticleCardProps {
  article: Article;
  /** `lead` is the oversized first story; `standard` fills the grid. */
  variant?: 'lead' | 'standard';
}

/**
 * Apple-News-style card matching the app's redesigned NewsCard: fixed-aspect
 * artwork, a colour-coded category tag, then the headline and a source line.
 *
 * Headline and summary length are capped with `line-clamp`, never by slicing
 * the string — measuring in characters cut headlines mid-word at a width the
 * layout had not actually reached.
 */
export function ArticleCard({ article, variant = 'standard' }: ArticleCardProps) {
  const category = getArticleCategory(article);
  const isLead = variant === 'lead';

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_16px_32px_-12px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#1e1e1e]"
    >
      <ArticleThumb
        src={article.image_url}
        alt=""
        categoryKind={category.kind}
        className={isLead ? 'aspect-[16/9]' : 'aspect-[3/2]'}
      />

      <div className={`flex flex-1 flex-col ${isLead ? 'gap-3 p-5 sm:p-6' : 'gap-2 p-4'}`}>
        <CategoryTag category={category} />

        <h2
          className={
            isLead
              ? 'text-balance text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl'
              : 'text-balance text-[17px] font-semibold leading-snug tracking-[-0.01em]'
          }
        >
          <Link href={`/article/${article.id}`} className="after:absolute after:inset-0">
            <span className={isLead ? 'line-clamp-3' : 'line-clamp-3 block'}>{article.title}</span>
          </Link>
        </h2>

        {article.cleanSummary && (
          <p
            className={`text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400 ${
              isLead ? 'line-clamp-3' : 'line-clamp-2'
            }`}
          >
            {article.cleanSummary}
          </p>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
          <span className="truncate font-medium">{formatSource(article.source)}</span>
          {article.hasAiSummary && <AiSparkle />}
          <span aria-hidden="true">·</span>
          <time dateTime={article.published_at} className="shrink-0">
            {relativeTime(article.published_at)}
          </time>
        </div>
      </div>
    </article>
  );
}
