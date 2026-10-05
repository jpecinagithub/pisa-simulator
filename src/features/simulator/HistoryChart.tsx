// User's estimated score plotted against official OECD cycle averages
// (PISA 2012–2025). Recharts, lazy-loaded by the results dashboard.
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Domain } from '../../types/oecd';
import type { TestResult } from '../../types/simulator';
import { useLang } from '../../i18n';
import { HISTORY_CYCLES, getCompareData, type CycleAverages } from './oecdSource';
import { domainName } from './shared';

const DOMAIN_HEX: Record<Domain, string> = {
  math: '#2563eb',
  reading: '#b45309',
  science: '#059669',
};

export function HistoryChart({ result, domain }: { result: TestResult; domain: Domain }) {
  const { t } = useLang();
  const [averages, setAverages] = useState<CycleAverages | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCompareData().then((d) => {
      if (!cancelled) setAverages(d.averages);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!averages) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-ink-600" aria-busy="true">
        {t('common.loading')}
      </div>
    );
  }

  const key = domain === 'math' ? 'mathematics' : domain;
  const data = HISTORY_CYCLES.map((year) => ({
    year: String(year),
    oecd: averages[year][key],
    you: year === 2025 ? Math.round(result.domains[domain].score) : null,
  }));

  return (
    <figure>
      <div className="h-64 w-full sm:h-72" role="img" aria-label={t('sim.results.historyTitle')}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e9f2" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis domain={[400, 560]} tick={{ fontSize: 12 }} width={44} />
            <Tooltip
              formatter={(value, name) => [
                (value as number | undefined) ?? '—',
                name === 'oecd' ? t('sim.results.oecdAverage') : t('sim.results.you'),
              ]}
            />
            <Legend
              formatter={(v: string) => (v === 'oecd' ? t('sim.results.oecdAverage') : t('sim.results.you'))}
            />
            <Line
              type="monotone"
              dataKey="oecd"
              stroke="#0e2a52"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="you"
              stroke={DOMAIN_HEX[domain]}
              strokeWidth={3}
              dot={{ r: 6, fill: DOMAIN_HEX[domain] }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-ink-600">
        {t('sim.results.historySubtitle')} · {domainName(domain, t)} · {t('common.source')}
      </figcaption>
    </figure>
  );
}

export function HistoryChartSection({ result }: { result: TestResult }) {
  const { t } = useLang();
  const [domain, setDomain] = useState<Domain>('math');
  const domains: Domain[] = ['math', 'reading', 'science'];
  return (
    <div>
      <div className="mb-4 inline-flex rounded-xl border border-line p-1" role="group" aria-label={t('sim.results.historyTitle')}>
        {domains.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDomain(d)}
            aria-pressed={domain === d}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
              domain === d ? 'bg-navy-900 text-white' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {domainName(d, t)}
          </button>
        ))}
      </div>
      <HistoryChart result={result} domain={domain} />
      <p className="mt-2 text-xs leading-relaxed text-ink-600">{t('sim.results.compareDisclaimer')}</p>
    </div>
  );
}
