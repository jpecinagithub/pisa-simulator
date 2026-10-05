import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLang } from '../i18n';
import {
  OECD_AVERAGE_CODE,
  getCountry,
  getCycleResults,
  getOecdAverage,
  listCountries,
} from '../lib/oecd';
import type { CountryMeta, Domain } from '../types/oecd';
import { DOMAIN_FIELD } from '../features/explorer/domain';
import { ScoreTable } from '../features/explorer/ScoreTable';
import { CompareSelector } from '../features/explorer/CompareSelector';
import { usePageMeta } from '../features/explorer/usePageMeta';
import { trackEvent } from '../lib/analytics';

type StatusFilter = 'all' | 'oecd' | 'non-oecd';
type ChangeFilter = 'any' | 'improved' | 'declined' | 'stable';

const SPEC_AVG = { science: 482, mathematics: 463, reading: 461 };

function classifyChange(diff: number | null): 'improved' | 'declined' | 'stable' | null {
  if (diff == null) return null;
  if (diff >= 5) return 'improved';
  if (diff <= -5) return 'declined';
  return 'stable';
}

export default function Results2025() {
  const { t, lang } = useLang();
  usePageMeta(t('explorer.results2025.metaTitle'), t('explorer.results2025.metaDescription'));

  const [domain, setDomain] = useState<Domain>('science');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [region, setRegion] = useState<string>('all');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [change2022, setChange2022] = useState<ChangeFilter>('any');
  const [change2018, setChange2018] = useState<ChangeFilter>('any');
  const [compare, setCompare] = useState<string[]>(['ESP', 'FIN', 'SGP', 'USA', OECD_AVERAGE_CODE]);

  const countries = useMemo(() => listCountries(), []);
  const regions = useMemo(() => [...new Set(countries.map((c) => c.region))].sort(), [countries]);

  const averages = getOecdAverage(2025) ?? SPEC_AVG;

  const r2025 = useMemo(() => getCycleResults(2025).filter((r) => r.countryCode !== OECD_AVERAGE_CODE), []);
  const r2022 = useMemo(() => getCycleResults(2022), []);
  const r2018 = useMemo(() => getCycleResults(2018), []);
  const metaByCode = useMemo(() => new Map(countries.map((c) => [c.code, c])), [countries]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return r2025.filter((r) => {
      const meta = metaByCode.get(r.countryCode);
      if (!meta) return false;
      if (ql && !meta.nameEn.toLowerCase().includes(ql) && !meta.nameEs.toLowerCase().includes(ql)) return false;
      if (status === 'oecd' && !meta.oecd) return false;
      if (status === 'non-oecd' && meta.oecd) return false;
      if (region !== 'all' && meta.region !== region) return false;
      const score = r[DOMAIN_FIELD[domain]];
      if (minScore !== '' && (score == null || score < Number(minScore))) return false;
      if (maxScore !== '' && (score == null || score > Number(maxScore))) return false;
      if (change2022 !== 'any') {
        const prev = r2022.find((x) => x.countryCode === r.countryCode)?.[DOMAIN_FIELD[domain]];
        const cls = classifyChange(score != null && prev != null ? score - prev : null);
        if (cls !== change2022) return false;
      }
      if (change2018 !== 'any') {
        const prev = r2018.find((x) => x.countryCode === r.countryCode)?.[DOMAIN_FIELD[domain]];
        const cls = classifyChange(score != null && prev != null ? score - prev : null);
        if (cls !== change2018) return false;
      }
      return true;
    });
  }, [r2025, r2022, r2018, metaByCode, q, status, region, domain, minScore, maxScore, change2022, change2018]);

  const compareData = useMemo(() => {
    const domains: Domain[] = ['math', 'reading', 'science'];
    const labels: Record<Domain, string> = {
      math: t('explorer.results.domainMath'),
      reading: t('explorer.results.domainReading'),
      science: t('explorer.results.domainScience'),
    };
    return domains.map((d) => {
      const row: Record<string, string | number | null> = { domain: labels[d] };
      for (const code of compare) {
        if (code === OECD_AVERAGE_CODE) row[code] = getOecdAverage(2025)?.[DOMAIN_FIELD[d]] ?? null;
        else row[code] = r2025.find((x) => x.countryCode === code)?.[DOMAIN_FIELD[d]] ?? null;
      }
      return row;
    });
  }, [compare, r2025, t]);

  const compareNames = useMemo(() => {
    const out: Record<string, string> = {};
    for (const code of compare) {
      out[code] =
        code === OECD_AVERAGE_CODE
          ? t('explorer.results.oecdAverage')
          : (() => {
              const m: CountryMeta | undefined = getCountry(code);
              return m ? (lang === 'es' ? m.nameEs : m.nameEn) : code;
            })();
    }
    return out;
  }, [compare, lang, t]);

  function onCompareChange(codes: string[]) {
    setCompare(codes);
    trackEvent('country_compared', { count: codes.length, page: 'results2025' });
  }

  function clearFilters() {
    setQ('');
    setStatus('all');
    setRegion('all');
    setMinScore('');
    setMaxScore('');
    setChange2022('any');
    setChange2018('any');
  }

  const avgCards = [
    { label: t('explorer.results.domainScience'), value: averages.science, color: 'bg-[#059669]' },
    { label: t('explorer.results.domainMath'), value: averages.mathematics, color: 'bg-[#2563eb]' },
    { label: t('explorer.results.domainReading'), value: averages.reading, color: 'bg-[#b45309]' },
  ];

  const inputCls = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink-900';
  const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600';

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-navy-950">{t('explorer.results2025.title')}</h1>

      {/* Banner */}
      <div className="mt-6 rounded-2xl bg-navy-950 p-6 text-white md:p-8">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <p className="font-display text-xl font-bold">{t('explorer.results2025.bannerYear')}</p>
          <p className="font-display text-xl font-bold text-white/70">{t('explorer.results2025.bannerPublication')}</p>
        </div>
        <p className="mt-3 max-w-3xl text-white/80">{t('explorer.results2025.bannerNote')}</p>
      </div>

      {/* OECD averages */}
      <section aria-labelledby="avg" className="mt-10">
        <h2 id="avg" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.results2025.averagesTitle')}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {avgCards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <span aria-hidden="true" className={`mb-2 block h-2 w-10 rounded-full ${c.color}`} />
              <p className="text-sm font-medium text-ink-600">{c.label}</p>
              <p className="font-display text-4xl font-bold tabular-nums text-navy-950">{c.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-400">{t('explorer.components.sourceNote')}</p>
      </section>

      {/* Filters */}
      <section aria-labelledby="filters" className="mt-10">
        <h2 id="filters" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.results2025.filtersTitle')}
        </h2>
        <div className="mt-4 grid gap-4 rounded-2xl border border-line bg-mist p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="f-country" className={labelCls}>{t('explorer.results2025.filterCountry')}</label>
            <input
              id="f-country"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('explorer.results2025.filterCountryPlaceholder')}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="f-status" className={labelCls}>{t('explorer.results2025.filterStatus')}</label>
            <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={inputCls}>
              <option value="all">{t('explorer.results2025.statusAll')}</option>
              <option value="oecd">{t('explorer.results2025.statusOecd')}</option>
              <option value="non-oecd">{t('explorer.results2025.statusNonOecd')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-region" className={labelCls}>{t('explorer.results2025.filterRegion')}</label>
            <select id="f-region" value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls}>
              <option value="all">{t('explorer.results2025.regionAll')}</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <span id="f-domain-label" className={labelCls}>{t('explorer.results2025.filterDomain')}</span>
            <div role="group" aria-labelledby="f-domain-label" className="flex overflow-hidden rounded-xl border border-line bg-paper">
              {(['math', 'reading', 'science'] as Domain[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomain(d)}
                  aria-pressed={d === domain}
                  className={`flex-1 px-2 py-2.5 text-sm font-medium ${d === domain ? 'bg-navy-900 text-white' : 'text-ink-600 hover:bg-mist'}`}
                >
                  {d === 'math' ? t('explorer.results.domainMath') : d === 'reading' ? t('explorer.results.domainReading') : t('explorer.results.domainScience')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="f-min" className={labelCls}>{t('explorer.results2025.filterMin')}</label>
            <input id="f-min" type="number" min={0} max={800} value={minScore} onChange={(e) => setMinScore(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="f-max" className={labelCls}>{t('explorer.results2025.filterMax')}</label>
            <input id="f-max" type="number" min={0} max={800} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="f-ch22" className={labelCls}>{t('explorer.results2025.filterChange2022')}</label>
            <select id="f-ch22" value={change2022} onChange={(e) => setChange2022(e.target.value as ChangeFilter)} className={inputCls}>
              <option value="any">{t('explorer.results2025.changeAny')}</option>
              <option value="improved">{t('explorer.results2025.changeImproved')}</option>
              <option value="declined">{t('explorer.results2025.changeDeclined')}</option>
              <option value="stable">{t('explorer.results2025.changeStable')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="f-ch18" className={labelCls}>{t('explorer.results2025.filterChange2018')}</label>
            <select id="f-ch18" value={change2018} onChange={(e) => setChange2018(e.target.value as ChangeFilter)} className={inputCls}>
              <option value="any">{t('explorer.results2025.changeAny')}</option>
              <option value="improved">{t('explorer.results2025.changeImproved')}</option>
              <option value="declined">{t('explorer.results2025.changeDeclined')}</option>
              <option value="stable">{t('explorer.results2025.changeStable')}</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-ink-600" aria-live="polite">
            {t('explorer.results2025.resultsCount').replace('{count}', String(filtered.length))}
          </p>
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-accent-dark hover:underline">
            {t('explorer.results2025.clearFilters')}
          </button>
        </div>
        <div className="mt-4">
          {filtered.length > 0 ? (
            <ScoreTable year={2025} initialDomain={domain} rows={filtered} key={domain + filtered.length} />
          ) : (
            <p className="rounded-xl border border-dashed border-line p-8 text-center text-ink-600">
              {t('explorer.results2025.emptyFilters')}
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-400">{t('explorer.components.sourceNote')}</p>
      </section>

      {/* Multi-country comparison */}
      <section aria-labelledby="compare" className="mt-12">
        <h2 id="compare" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.results2025.compareTitle')}
        </h2>
        <p className="mt-1 text-sm text-ink-600">{t('explorer.results2025.compareHint')}</p>
        <div className="mt-4">
          <CompareSelector value={compare} onChange={onCompareChange} />
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-paper p-4 md:p-6">
          <h3 className="mb-3 font-semibold text-navy-900">{t('explorer.results2025.chartTitle')}</h3>
          {compare.length > 0 ? (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#e4e9f2" strokeDasharray="3 3" />
                  <XAxis dataKey="domain" tick={{ fontSize: 12 }} stroke="#475467" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#475467" domain={[300, 650]} width={44} />
                  <Tooltip
                    formatter={(value, name) => [
                      typeof value === 'number' ? Math.round(value) : t('common.common.noData'),
                      compareNames[String(name)] ?? name,
                    ]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e4e9f2' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} formatter={(v) => compareNames[String(v)] ?? v} />
                  {compare.map((code, i) => (
                    <Bar
                      key={code}
                      dataKey={code}
                      name={code}
                      fill={['#2563eb', '#b45309', '#059669', '#7c3aed', '#dc2626'][i % 5]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-ink-600">{t('explorer.components.trend.empty')}</p>
          )}
          <p className="mt-2 text-xs text-ink-400">{t('explorer.components.sourceNote')}</p>
        </div>
      </section>

      <p className="mt-10 rounded-xl bg-mist p-4 text-sm text-ink-600">{t('explorer.results2025.disclaimer')}</p>
    </div>
  );
}
