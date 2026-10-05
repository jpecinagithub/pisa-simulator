import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../i18n';
import { getCountry, getCycleResults } from '../../lib/oecd';
import { flagEmoji } from './flags';

interface WorldGridProps {
  year?: number;
}

/** "PISA around the world": tile grid of participating systems for a cycle.
 *  Hover/tap reveals a tooltip with scores; click opens the country profile. */
export function WorldGrid({ year = 2025 }: WorldGridProps) {
  const { t, lang } = useLang();
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const rows = getCycleResults(year).filter((r) => r.countryCode !== 'oecd-average');

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {rows.map((r) => {
          const meta = getCountry(r.countryCode);
          if (!meta) return null;
          const name = lang === 'es' ? meta.nameEs : meta.nameEn;
          const active = activeCode === r.countryCode;
          const scores = [
            `${t('explorer.results.domainMath')}: ${r.mathematics != null ? Math.round(r.mathematics) : t('common.common.noData')}`,
            `${t('explorer.results.domainReading')}: ${r.reading != null ? Math.round(r.reading) : t('common.common.noData')}`,
            `${t('explorer.results.domainScience')}: ${r.science != null ? Math.round(r.science) : t('common.common.noData')}`,
          ];
          return (
            <li key={r.countryCode} className="relative">
              <Link
                to={`/country/${r.countryCode.toLowerCase()}`}
                aria-label={`${name} — PISA ${year} — ${t('explorer.components.worldGrid.openProfile')}`}
                aria-describedby={active ? `wg-tip-${r.countryCode}` : undefined}
                onMouseEnter={() => setActiveCode(r.countryCode)}
                onMouseLeave={() => setActiveCode((c) => (c === r.countryCode ? null : c))}
                onFocus={() => setActiveCode(r.countryCode)}
                onBlur={() => setActiveCode((c) => (c === r.countryCode ? null : c))}
                onClick={() => setActiveCode(r.countryCode)}
                className="flex h-full min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border border-line bg-paper px-2 py-3 text-center shadow-sm transition-colors hover:border-navy-700 hover:bg-mist"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  {flagEmoji(meta.flag)}
                </span>
                <span className="line-clamp-2 text-xs font-medium leading-tight text-ink-900">
                  {name}
                </span>
              </Link>
              {active && (
                <div
                  id={`wg-tip-${r.countryCode}`}
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-xl border border-line bg-navy-950 p-3 text-left text-white shadow-xl"
                >
                  <p className="mb-1 text-sm font-semibold">
                    {name} <span className="font-normal text-white/70">· PISA {year}</span>
                  </p>
                  <ul className="space-y-0.5 text-xs tabular-nums text-white/90">
                    {scores.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
