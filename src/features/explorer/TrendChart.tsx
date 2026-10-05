import { useMemo, useState } from 'react';
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
import { useLang } from '../../i18n';
import {
  OECD_AVERAGE_CODE,
  getCountry,
  getCountrySeries,
  getOecdAverage,
} from '../../lib/oecd';
import { PISA_CYCLES } from '../../types/oecd';
import type { Domain } from '../../types/oecd';
import { DOMAIN_FIELD } from './domain';

const LINE_COLORS = ['#2563eb', '#b45309', '#059669', '#7c3aed', '#dc2626', '#0891b2'];

interface TrendChartProps {
  codes: string[];
  domain: Domain;
  onDomainChange?: (d: Domain) => void;
  /** render the OECD-average toggle control (default true) */
  showOecdToggle?: boolean;
  defaultShowOecd?: boolean;
  height?: number;
}

function displayName(code: string, lang: 'en' | 'es', t: (k: string) => string): string {
  if (code === OECD_AVERAGE_CODE) return t('explorer.results.oecdAverage');
  const m = getCountry(code);
  if (!m) return code;
  return lang === 'es' ? m.nameEs : m.nameEn;
}

/** Multi-line performance trend chart: countries × PISA cycles. */
export function TrendChart({
  codes,
  domain,
  onDomainChange,
  showOecdToggle = true,
  defaultShowOecd = true,
  height = 340,
}: TrendChartProps) {
  const { t, lang } = useLang();
  const [showOecd, setShowOecd] = useState(defaultShowOecd);

  const data = useMemo(() => {
    return PISA_CYCLES.map((year) => {
      const row: Record<string, number | null> = { year };
      for (const code of codes) {
        if (code === OECD_AVERAGE_CODE) {
          row[code] = getOecdAverage(year)?.[DOMAIN_FIELD[domain]] ?? null;
        } else {
          const s = getCountrySeries(code).find((p) => p.year === year);
          row[code] = s?.[DOMAIN_FIELD[domain]] ?? null;
        }
      }
      return row;
    });
  }, [codes, domain]);

  const lines = useMemo(() => {
    const countryCodes = codes.filter((c) => c !== OECD_AVERAGE_CODE);
    const out: { code: string; name: string; color: string; dashed: boolean }[] =
      countryCodes.map((code, i) => ({
        code,
        name: displayName(code, lang, t),
        color: LINE_COLORS[i % LINE_COLORS.length],
        dashed: false,
      }));
    if (showOecd && codes.includes(OECD_AVERAGE_CODE)) {
      out.push({ code: OECD_AVERAGE_CODE, name: displayName(OECD_AVERAGE_CODE, lang, t), color: '#101828', dashed: true });
    }
    return out;
  }, [codes, lang, t, showOecd]);

  if (codes.length === 0) {
    return <p className="py-8 text-center text-ink-600">{t('explorer.components.trend.empty')}</p>;
  }

  const domainOptions: Domain[] = ['math', 'reading', 'science'];
  const domainLabels: Record<Domain, string> = {
    math: t('explorer.results.domainMath'),
    reading: t('explorer.results.domainReading'),
    science: t('explorer.results.domainScience'),
  };

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div role="group" aria-label={t('explorer.components.trend.domain')} className="flex overflow-hidden rounded-lg border border-line">
          {domainOptions.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDomainChange?.(d)}
              aria-pressed={d === domain}
              className={`px-3 py-1.5 text-sm font-medium ${
                d === domain ? 'bg-navy-900 text-white' : 'bg-paper text-ink-600 hover:bg-mist'
              }`}
            >
              {domainLabels[d]}
            </button>
          ))}
        </div>
        {showOecdToggle && codes.includes(OECD_AVERAGE_CODE) && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              checked={showOecd}
              onChange={(e) => setShowOecd(e.target.checked)}
              className="h-4 w-4 accent-[#0e7c7b]"
            />
            {t('explorer.components.trend.showOecd')}
          </label>
        )}
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#e4e9f2" strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#475467" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#475467"
              domain={['auto', 'auto']}
              width={44}
              aria-label={domainLabels[domain]}
            />
            <Tooltip
              formatter={(value, name) => [
                typeof value === 'number' ? Math.round(value) : t('common.common.noData'),
                name,
              ]}
              labelFormatter={(y) => `${y}`}
              contentStyle={{ borderRadius: 8, border: '1px solid #e4e9f2' }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            {lines.map((l) => (
              <Line
                key={l.code}
                type="monotone"
                dataKey={l.code}
                name={l.name}
                stroke={l.color}
                strokeWidth={2}
                strokeDasharray={l.dashed ? '6 4' : undefined}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-ink-400">{t('explorer.components.sourceNote')}</figcaption>
    </figure>
  );
}
