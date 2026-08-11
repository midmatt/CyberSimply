/** Marks stories carrying an AI-written explainer, like the app's sparkle. */
export function AiSparkle({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-label="Simplified with AI"
      role="img"
      className={`h-3.5 w-3.5 shrink-0 text-[#ff7613] ${className}`}
      fill="currentColor"
    >
      <path d="M12 2.5l1.7 4.9 4.9 1.7-4.9 1.7L12 15.7l-1.7-4.9-4.9-1.7 4.9-1.7L12 2.5zM18.5 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
    </svg>
  );
}
