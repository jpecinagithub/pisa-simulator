import { useMemo, useState } from 'react';
import { useLang } from '../i18n';
import {
  OECD_AVERAGE_CODE,
  getCountry,
  getCycleResults,
  listCountries,
} from '../lib/oecd';
import { PISA_CYCLES } from '../types/oecd';
import type { Domain } from '../types/oecd';
import { DOMAIN_FIELD } from '../features/explorer/domain';
import { ScoreTable } from '../features/explorer/ScoreTable';
import { TrendChart } from '../features/explorer/TrendChart';
import { CompareSelector } from '../features/explorer/CompareSelector';
import { ChangeBadge } from '../features/explorer/ChangeBadge';
import { usePageMeta } from '../features/explorer/usePageMeta';
import { trackEvent } from '../lib/analytics';

const DEFAULT_COMPARE = ['ESP', 'FIN', 'SGP', 'USA', OECD_AVERAGE_CODE];

export default function GlobalResults() {
  const { t, lang } = useLang();
  usePageMeta(t('explorer.results.metaTitle'), t('explorer.results.metaDescription'));

  const [cycle, setCycle] = useState<number>(2025);
  const [domain, setDomain] = useState<Domain>('math');
  const [compare, setCompare] = useState<string[]>(DEFAULT_COMPARE);
  const [changeCode, setChangeCode] = useState<string>('ESP');

  const prevCycle = useMemo(() => {
    const idx = PISA_CYCLES.indexOf(cycle as (typeof PISA_CYCLES)[number]);
    return idx > 0 ? PISA_CYCLES[idx - 1] : null;
  }, [cycle]);

  const changeRows = useMemo(() => {
    if (prevCycle == null) return [];
    const cur = getCycleResults(cycle);
    const prv = getCycleResults(prevCycle);
    const domains: Domain[] = ['math', 'reading', 'science'];
    return domains.map((d) => ({
      domain: d,
      current: cur.find((r) => r.countryCode === changeCode)?.[DOMAIN_FIELD[d]],
      previous: prv.find((r) => r.countryCode === changeCode)?.[DOMAIN_FIELD[d]],
    }));
  }, [cycle, prevCycle, changeCode]);

  const countries = useMemo(() => listCountries(), []);
  const domainLabel: Record<Domain, string> = {
    math: t('explorer.results.domainMath'),
    reading: t('explorer.results.domainReading'),
    science: t('explorer.results.domainScience'),
  };

  function onCompareChange(codes: string[]) {
    setCompare(codes);
    trackEvent('country_compared', { count: codes.length, page: 'results' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-navy-950">{t('explorer.results.title')}</h1>
      <p className="mt-3 max-w-3xl text-ink-600">{t('explorer.results.intro')}</p>

      {/* Cycle selector */}
      <div className="mt-8">
        <label htmlFor="cycle" className="mb-2 block text-sm font-semibold text-navy-900">
          {t('explorer.results.cycleLabel')}
        </label>
        <div id="cycle" role="group" aria-label={t('explorer.results.cycleLabel')} className="flex flex-wrap gap-2">
          {PISA_CYCLES.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setCycle(y)}
              aria-pressed={y === cycle}
              className={`rounded-lg px-4 py-2 text-sm font-semibold tabular-nums ${
                y === cycle ? 'bg-navy-900 text-white' : 'border border-line bg-paper text-ink-600 hover:bg-mist'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Ranking table */}
      <section aria-labelledby="ranking" className="mt-10">
        <h2 id="ranking" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.results.tableTitle')} — {cycle}
        </h2>
        <div className="mt-4">
          <ScoreTable year={cycle} initialDomain={domain} key={cycle} />
        </div>
        <p className="mt-2 text-xs text-ink-400">{t('explorer.components.sourceNote')}</p>
      </section>

      {/* Trend + compare */}
      <section aria-labelledby="trend" className="mt-12">
        <h2 id="trend" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.results.trendTitle')}
        </h2>
        <p className="mt-1 text-sm text-ink-600">{t('explorer.results.compareHint')}</p>
        <div className="mt-4">
          <CompareSelector value={compare} onChange={onCompareChange} />
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-paper p-4 md:p-6">
          <TrendChart codes={compare} domain={domain} onDomainChange={setDomain} />
        </div>
      </section>

      {/* Change since previous cycle */}
      <section aria-labelledby="change" className="mt-12">
        <h2 id="change" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.results.changeTitle')}
        </h2>
        <div className="mt-4 max-w-md">
          <label htmlFor="change-country" className="mb-2 block text-sm font-semibold text-navy-900">
            {t('explorer.results.changeCountryLabel')}
          </label>
          <select
            id="change-country"
            value={changeCode}
            onChange={(e) => setChangeCode(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink-900"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {lang === 'es' ? c.nameEs : c.nameEn}
              </option>
            ))}
          </select>
        </div>
        {prevCycle != null && changeRows.length > 0 ? (
          <div className="data-scroll mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[640px] border-collapse bg-paper text-sm">
              <caption className="sr-only">
                {t('explorer.results.changeTitle')} — {cycle} vs {prevCycle}
              </caption>
              <thead>
                <tr className="border-b border-line bg-mist text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.results.changeCountryLabel')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.results.changeScore').replace('{year}', String(cycle))}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.results.changePrevious').replace('{year}', String(prevCycle))}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.results.changeAbsolute')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.results.changePercent')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.results.changeTrend')}</th>
                </tr>
              </thead>
              <tbody>
                {changeRows.map((r) => {
                  const diff = r.current != null && r.previous != null ? r.current - r.previous : null;
                  const pct = diff != null && r.previous ? (diff / r.previous) * 100 : null;
                  return (
                    <tr key={r.domain} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 font-medium text-navy-900">{domainLabel[r.domain]}</td>
                      <td className="px-4 py-2.5 tabular-nums">{r.current != null ? Math.round(r.current) : t('common.common.noData')}</td>
                      <td className="px-4 py-2.5 tabular-nums">{r.previous != null ? Math.round(r.previous) : t('common.common.noData')}</td>
                      <td className="px-4 py-2.5 tabular-nums">{diff != null ? `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(0)}` : t('common.common.noData')}</td>
                      <td className="px-4 py-2.5 tabular-nums">{pct != null ? `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%` : t('common.common.noData')}</td>
                      <td className="px-4 py-2.5">
                        <ChangeBadge current={r.current} previous={r.previous} previousYear={prevCycle} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-ink-600">{t('explorer.results.changeEmpty')}</p>
        )}
        <p className="mt-2 text-xs text-ink-400">
          {metaName(changeCode, lang)} · {t('explorer.components.sourceNote')}
        </p>
      </section>
    </div>
  );
}

function metaName(code: string, lang: 'en' | 'es'): string {
  const m = getCountry(code);
  if (!m) return code;
  return lang === 'es' ? m.nameEs : m.nameEn;
}
