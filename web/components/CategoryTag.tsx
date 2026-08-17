import { CATEGORY_STYLES, type ArticleCategory } from '@/lib/category';

/**
 * The small colour-coded pill above each headline, matching the app's
 * CategoryTag. Colours come through CSS custom properties so the dark variant
 * can swap without shipping a client component.
 */
export function CategoryTag({ category }: { category: ArticleCategory }) {
  const style = CATEGORY_STYLES[category.kind];

  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-[var(--tag-tint)] text-[var(--tag-text)] dark:bg-[var(--tag-tint-dark)] dark:text-[var(--tag-text-dark)]"
      style={
        {
          '--tag-text': style.text,
          '--tag-text-dark': style.darkText,
          '--tag-tint': style.tint,
          '--tag-tint-dark': style.darkTint,
        } as React.CSSProperties
      }
    >
      {category.label}
    </span>
  );
}
