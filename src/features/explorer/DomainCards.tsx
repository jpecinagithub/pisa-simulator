import { useMemo } from 'react';
import { useLang } from '../../i18n';
import { getCycleResults, getOecdAverage } from '../../lib/oecd';
import type { Domain } from '../../types/oecd';
import { ChangeBadge } from './ChangeBadge';
import { DOMAIN_FIELD } from './domain';

interface DomainCardsProps {
  code: string;
  /** latest cycle to display (default 2025) */
  year?: number;
  /** previous cycle for the change badge (default 2022) */
  previousYear?: number;
}

const DOMAINS: { key: Domain; color: string; labelKey: string }[] = [
  { key: 'math', color: 'bg-[#2563eb]', labelKey: 'explorer.results.domainMath' },
  { key: 'reading', color: 'bg-[#b45309]', labelKey: 'explorer.results.domainReading' },
  { key: 'science', color: 'bg-[#059669]', labelKey: 'explorer.results.domainScience' },
];

/** Three domain cards: score, vs OECD, global rank, change since previous cycle. */
export function DomainCards({ code, year = 2025, previousYear = 2022 }: DomainCardsProps) {
  const { t } = useLang();

  const rows = useMemo(() => {
    const current = getCycleResults(year).filter((r) => r.countryCode !== 'oecd-average');
    const prev = getCycleResults(previousYear);
    const oecd = getOecdAverage(year);
    return DOMAINS.map((d) => {
      const cur = current.find((r) => r.countryCode === code);
      const prv = prev.find((r) => r.countryCode === code);
      const curScore = cur?.[DOMAIN_FIELD[d.key]];
      const sorted = [...current]
        .map((r) => r[DOMAIN_FIELD[d.key]])
        .filter((v): v is number => v != null)
        .sort((a, b) => b - a);
      const rank = curScore != null ? sorted.indexOf(curScore) + 1 : null;
      return {
        ...d,
        score: curScore,
        prevScore: prv?.[DOMAIN_FIELD[d.key]],
        oecdScore: oecd?.[DOMAIN_FIELD[d.key]],
        rank,
        total: sorted.length,
      };
    });
  }, [code, year, previousYear]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {rows.map((d) => (
        <article key={d.key} className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span aria-hidden="true" className={`h-3 w-3 rounded-full ${d.color}`} />
            <h3 className="font-display text-lg font-semibold text-navy-950">{t(d.labelKey)}</h3>
          </div>
          {d.score == null ? (
            <p className="text-ink-400">{t('common.common.noData')}</p>
          ) : (
            <>
              <p className="font-display text-4xl font-bold tabular-nums text-navy-950">
                {Math.round(d.score)}
              </p>
              <div className="mt-3 space-y-2 text-sm">
                {d.oecdScore != null && (
                  <p className="text-ink-600">
                    {t('explorer.results.vsOecd').replace(
                      '{diff}',
                      `${d.score >= d.oecdScore ? '+' : '−'}${Math.abs(Math.round(d.score - d.oecdScore))}`,
                    )}{' '}
                    <span className="text-ink-400">
                      ({Math.round(d.oecdScore)} · {t('explorer.results.oecdAverage')})
                    </span>
                  </p>
                )}
                {d.rank != null && (
                  <p className="text-ink-600">
                    {t('explorer.results.rankOf').replace('{rank}', String(d.rank)).replace('{total}', String(d.total))}
                  </p>
                )}
                <ChangeBadge current={d.score} previous={d.prevScore} previousYear={previousYear} />
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
