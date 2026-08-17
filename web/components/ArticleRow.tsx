import Link from 'next/link';
import { CategoryTag } from './CategoryTag';
import { BreakingBadge } from './BreakingBadge';
import { AiSparkle } from './AiSparkle';
import { ArticleThumb } from './ArticleThumb';
import { getArticleCategory } from '@/lib/category';
import { relativeTime } from '@/lib/date';
import { formatSource } from '@/lib/text';
import type { Article } from '@/lib/types';

/**
 * Compact row used beside the lead story, mirroring the app's ArticleRow:
 * square thumbnail, tag, headline, then source and time on one line.
 */
export function ArticleRow({ article }: { article: Article }) {
  const category = getArticleCategory(article);

  return (
    <article className="group relative flex gap-3.5 py-4">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {article.is_breaking && <BreakingBadge category={article.breaking_category} />}
          <CategoryTag category={category} />
        </div>

        <h3 className="mt-1.5 text-[15px] font-semibold leading-snug tracking-[-0.01em]">
          <Link href={`/article/${article.id}`} className="after:absolute after:inset-0">
            <span className="line-clamp-3">{article.title}</span>
          </Link>
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
          <span className="truncate font-medium">{formatSource(article.source)}</span>
          {article.hasAiSummary && <AiSparkle />}
          <span aria-hidden="true">·</span>
          <time dateTime={article.published_at} className="shrink-0">
            {relativeTime(article.published_at)}
          </time>
        </div>
      </div>

      <ArticleThumb
        src={article.image_url}
        alt=""
        categoryKind={category.kind}
        className="h-[74px] w-[74px] shrink-0 rounded-xl"
      />
    </article>
  );
}
