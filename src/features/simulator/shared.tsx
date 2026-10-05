// Shared presentational helpers for the simulator feature.
import type { ReactNode } from 'react';
import type { Domain } from '../../types/oecd';

const DOMAIN_STYLES: Record<Domain, { text: string; bg: string; bar: string; soft: string }> = {
  math: { text: 'text-math', bg: 'bg-math', bar: 'bg-math', soft: 'bg-blue-50' },
  reading: { text: 'text-reading', bg: 'bg-reading', bar: 'bg-reading', soft: 'bg-amber-50' },
  science: { text: 'text-science', bg: 'bg-science', bar: 'bg-science', soft: 'bg-emerald-50' },
};

export function domainStyle(d: Domain) {
  return DOMAIN_STYLES[d];
}

export function domainName(d: Domain, t: (k: string) => string): string {
  return t(`common.domains.${d}`);
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-semibold text-navy-900">{children}</h2>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function CompetencyBars({
  entries,
  compact = false,
}: {
  entries: Array<{ key: string; label: string; value: number }>;
  compact?: boolean;
}) {
  return (
    <ul className="space-y-3" aria-label="competency profile">
      {entries.map((e) => (
        <li key={e.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-ink-900`}>{e.label}</span>
            <span className={`${compact ? 'text-xs' : 'text-sm'} tabular-nums text-ink-600`}>
              {Math.round(e.value * 100)}%
            </span>
          </div>
          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-mist"
            role="img"
            aria-label={`${e.label}: ${Math.round(e.value * 100)} percent`}
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, Math.max(0, e.value * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Independence disclaimer banner — shown on setup, results and in the PDF. */
export function DisclaimerBanner({ text }: { text: string }) {
  return (
    <div
      role="note"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
    >
      <strong className="font-semibold">PISA Simulator — </strong>
      {text}
    </div>
  );
}
