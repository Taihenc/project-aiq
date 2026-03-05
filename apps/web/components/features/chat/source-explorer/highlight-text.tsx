import { highlightSegments } from '@/lib/highlight';

export function HighlightText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const segments = highlightSegments(text, query);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200/80 px-0.5 text-yellow-900 not-italic dark:bg-yellow-500/30 dark:text-yellow-200"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}
