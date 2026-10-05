import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
  getCountry,
  getCycleMeta,
  getCycleResults,
  getOecdAverage,
} from '../lib/oecd';
import { PISA_CYCLES } from '../types/oecd';
import type { Domain } from '../types/oecd';
import { DOMAIN_FIELD } from '../features/explorer/domain';
import { DomainCards } from '../features/explorer/DomainCards';
import { TrendChart } from '../features/explorer/TrendChart';
import { CompareSelector } from '../features/explorer/CompareSelector';
import { ChangeBadge } from '../features/explorer/ChangeBadge';
import { flagEmoji } from '../features/explorer/flags';
import { usePageMeta } from '../features/explorer/usePageMeta';
import { trackEvent } from '../lib/analytics';
import NotFound from './NotFound';

const LATEST = 2025;
const PREV = 2022;

function domainLabel(d: Domain, t: (k: string) => string): string {
  return d === 'math'
    ? t('explorer.results.domainMath')
    : d === 'reading'
      ? t('explorer.results.domainReading')
      : t('explorer.results.domainScience');
}

export default function CountryDetail() {
  const { t, lang } = useLang();
  const { code } = useParams<{ code: string }>();
  // URL slugs are lowercase (e.g. /country/spain); resolve case-insensitively
  // and use the canonical dataset code for every subsequent lookup.
  const meta = getCountry((code ?? '').toLowerCase());
  const ccode = meta?.code ?? (code ?? '').toLowerCase();

  const [domain, setDomain] = useState<Domain>('math');
  const [compare, setCompare] = useState<string[]>([]);

  const name = meta ? (lang === 'es' ? meta.nameEs : meta.nameEn) : ccode;
  usePageMeta(
    `${name} — PISA ${t('explorer.countries.title')} — PISA Simulator`,
    `${name}: PISA ${LATEST} results, historical evolution and domain comparison.`,
  );

  const trendSummary = useMemo(() => {
    if (!meta) return null;
    const val = (year: number, d: Domain) =>
      getCycleResults(year).find((x) => x.countryCode === ccode)?.[DOMAIN_FIELD[d]];
    const midYear = [2018, 2015].find((y) => val(y, domain) != null) ?? null;
    const longYear = PISA_CYCLES.find((y) => val(y, domain) != null) ?? null;
    return {
      last: { cur: val(LATEST, domain), prev: val(PREV, domain), year: PREV as number | null },
      mid: { cur: val(LATEST, domain), prev: midYear != null ? val(midYear, domain) : undefined, year: midYear },
      long: { cur: val(LATEST, domain), prev: longYear != null ? val(longYear, domain) : undefined, year: longYear },
    };
  }, [meta, ccode, domain]);

  const barData = useMemo(() => {
    const domains: Domain[] = ['math', 'reading', 'science'];
    const oecd = getOecdAverage(LATEST);
    const row = getCycleResults(LATEST).find((x) => x.countryCode === ccode);
    return domains.map((d) => ({
      domain: domainLabel(d, t),
      [name]: row?.[DOMAIN_FIELD[d]] ?? null,
      [t('explorer.results.oecdAverage')]: oecd?.[DOMAIN_FIELD[d]] ?? null,
    }));
  }, [ccode, t, name]);

  const chartCodes = useMemo(() => [ccode, ...compare], [ccode, compare]);

  if (!meta) {
    return <NotFound />;
  }

  function onCompareChange(codes: string[]) {
    setCompare(codes);
    trackEvent('country_compared', { count: codes.length + 1, page: 'country' });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <Link to="/countries" className="text-sm font-semibold text-accent-dark hover:underline">
        ← {t('explorer.countries.title')}
      </Link>

      {/* Headline */}
      <header className="mt-4 flex items-center gap-4">
        <span aria-hidden="true" className="text-5xl leading-none">
          {flagEmoji(meta.flag)}
        </span>
        <div>
          <h1 className="font-display text-4xl font-bold text-navy-950">{name}</h1>
          <p className="mt-1 text-sm text-ink-600">
            {meta.oecd ? 'OECD' : t('explorer.results2025.statusNonOecd')} · {meta.region} · PISA {LATEST}
          </p>
        </div>
      </header>

      {/* Latest results */}
      <section aria-labelledby="latest" className="mt-8">
        <h2 id="latest" className="sr-only">
          PISA {LATEST}
        </h2>
        <DomainCards code={ccode} year={LATEST} previousYear={PREV} />
        <p className="mt-2 text-xs text-ink-400">{t('explorer.components.sourceNote')}</p>
      </section>

      {/* Evolution */}
      <section aria-labelledby="evolution" className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="evolution" className="font-display text-2xl font-bold text-navy-950">
            {t('explorer.results.trendTitle')}
          </h2>
          <span className="text-xs text-ink-400">
            {getCycleMeta(LATEST)?.source ?? 'OECD PISA'} · {getCycleMeta(LATEST)?.publicationYear ?? ''}
          </span>
        </div>
        <div className="mt-4">
          <CompareSelector value={compare} onChange={onCompareChange} />
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-paper p-4 md:p-6">
          <TrendChart codes={chartCodes} domain={domain} onDomainChange={setDomain} />
        </div>
      </section>

      {/* Domain comparison */}
      <section aria-labelledby="domains" className="mt-12">
        <h2 id="domains" className="font-display text-2xl font-bold text-navy-950">
          PISA {LATEST} · {t('explorer.results2025.chartTitle')}
        </h2>
        <div className="mt-4 h-[300px] w-full rounded-2xl border border-line bg-paper p-4 md:p-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#e4e9f2" strokeDasharray="3 3" />
              <XAxis dataKey="domain" tick={{ fontSize: 12 }} stroke="#475467" />
              <YAxis tick={{ fontSize: 12 }} stroke="#475467" domain={[300, 650]} width={44} />
              <Tooltip
                formatter={(value) => (typeof value === 'number' ? Math.round(value) : t('common.common.noData'))}
                contentStyle={{ borderRadius: 8, border: '1px solid #e4e9f2' }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey={name} fill="#0e2a52" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t('explorer.results.oecdAverage')} fill="#98a2b3" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-ink-400">{t('explorer.components.sourceNote')}</p>
      </section>

      {/* Trend summary */}
      {trendSummary && (
        <section aria-labelledby="trend-summary" className="mt-12">
          <h2 id="trend-summary" className="font-display text-2xl font-bold text-navy-950">
            {domainLabel(domain, t)} — {t('explorer.results.changeTitle')}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { ...trendSummary.last, label: `${t('explorer.results.changeTrend')}: ${PREV} → ${LATEST}` },
              { ...trendSummary.mid, label: `5–10y` },
              { ...trendSummary.long, label: `${t('explorer.history.title')}` },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-line bg-paper p-5">
                <p className="text-sm font-semibold text-navy-900">{s.label}</p>
                <div className="mt-2">
                  <ChangeBadge current={s.cur ?? undefined} previous={s.prev ?? undefined} previousYear={s.year ?? undefined} />
                </div>
                <p className="mt-2 text-xs tabular-nums text-ink-600">
                  {s.prev != null ? Math.round(s.prev) : t('common.common.noData')}
                  {' → '}
                  {s.cur != null ? Math.round(s.cur) : t('common.common.noData')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Series table note */}
      <p className="mt-10 text-xs text-ink-400">
        {t('explorer.components.sourceNote')} · {getCycleMeta(LATEST)?.url ?? ''}
      </p>
    </div>
  );
}
