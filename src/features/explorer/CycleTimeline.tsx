import { useLang } from '../../i18n';
import { getTimeline } from '../../lib/oecd';

interface CycleTimelineProps {
  selected: number | null;
  onSelect: (year: number) => void;
}

/** Interactive PISA cycle timeline: horizontal on desktop, vertical on mobile. */
export function CycleTimeline({ selected, onSelect }: CycleTimelineProps) {
  const { t, lang } = useLang();
  const entries = getTimeline();

  return (
    <div>
      <p className="sr-only" id="timeline-label">
        {t('explorer.components.timeline.selectYear')}
      </p>
      {/* Desktop: horizontal */}
      <ol
        aria-labelledby="timeline-label"
        className="hidden md:flex md:items-stretch md:gap-0"
      >
        {entries.map((e, i) => {
          const isSel = e.year === selected;
          return (
            <li key={e.year} className="relative flex-1">
              {i > 0 && (
                <span aria-hidden="true" className="absolute left-0 right-1/2 top-7 h-0.5 -translate-y-1/2 bg-line" />
              )}
              {i < entries.length - 1 && (
                <span aria-hidden="true" className="absolute left-1/2 right-0 top-7 h-0.5 -translate-y-1/2 bg-line" />
              )}
              <button
                type="button"
                onClick={() => onSelect(e.year)}
                aria-pressed={isSel}
                className="relative mx-auto flex w-full max-w-[120px] flex-col items-center gap-2 rounded-xl px-2 py-3"
              >
                <span
                  aria-hidden="true"
                  className={`z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 font-display text-sm font-bold tabular-nums transition-colors ${
                    isSel
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-line bg-paper text-navy-900 hover:border-navy-700'
                  }`}
                >
                  {e.year}
                </span>
                <span className={`text-center text-xs leading-tight ${isSel ? 'font-semibold text-navy-900' : 'text-ink-600'}`}>
                  {lang === 'es' ? e.majorDomainEs : e.majorDomain}
                </span>
                <span className="text-center text-xs tabular-nums text-ink-400">
                  {e.participants} {t('explorer.history.participantsSuffix')}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {/* Mobile: vertical */}
      <ol aria-labelledby="timeline-label" className="md:hidden">
        {entries.map((e) => {
          const isSel = e.year === selected;
          return (
            <li key={e.year} className="relative border-l-2 border-line pl-6 pb-2 last:pb-0">
              <span
                aria-hidden="true"
                className={`absolute -left-[9px] top-4 h-4 w-4 rounded-full border-2 ${
                  isSel ? 'border-navy-900 bg-navy-900' : 'border-line bg-paper'
                }`}
              />
              <button
                type="button"
                onClick={() => onSelect(e.year)}
                aria-pressed={isSel}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left ${
                  isSel ? 'border-navy-900 bg-mist' : 'border-line bg-paper'
                }`}
              >
                <span>
                  <span className="block font-display text-lg font-bold tabular-nums text-navy-950">
                    {e.year}
                  </span>
                  <span className="block text-sm text-ink-600">
                    {lang === 'es' ? e.majorDomainEs : e.majorDomain}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-ink-400">
                  {e.participants} {t('explorer.history.participantsSuffix')}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
