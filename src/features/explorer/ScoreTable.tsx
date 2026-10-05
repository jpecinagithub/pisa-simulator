import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../i18n';
import { getCountry, getCycleResults } from '../../lib/oecd';
import type { Domain, PisaCycleResult } from '../../types/oecd';
import { flagEmoji } from './flags';
import { DOMAIN_FIELD } from './domain';

type SortKey = Domain | 'country';
type SortDir = 'asc' | 'desc';

interface ScoreTableProps {
  year: number;
  initialDomain?: Domain;
  /** Optional pre-filtered rows (e.g. Results2025 filters); defaults to full cycle. */
  rows?: PisaCycleResult[];
}

const DOMAIN_LABEL_KEYS: Record<Domain, string> = {
  math: 'explorer.results.domainMath',
  reading: 'explorer.results.domainReading',
  science: 'explorer.results.domainScience',
};

/** Sortable world ranking table for one PISA cycle. Missing scores render as "No data". */
export function ScoreTable({ year, initialDomain = 'math', rows }: ScoreTableProps) {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>(initialDomain);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const baseRows = useMemo(() => {
    const src = rows ?? getCycleResults(year);
    return src.filter((r) => r.countryCode !== 'oecd-average');
  }, [year, rows]);

  const sorted = useMemo(() => {
    const arr = [...baseRows];
    arr.sort((a, b) => {
      if (sortKey === 'country') {
        const na = getCountry(a.countryCode)?.[lang === 'es' ? 'nameEs' : 'nameEn'] ?? a.countryCode;
        const nb = getCountry(b.countryCode)?.[lang === 'es' ? 'nameEs' : 'nameEn'] ?? b.countryCode;
        return sortDir === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
      }
      const va = a[DOMAIN_FIELD[sortKey]];
      const vb = b[DOMAIN_FIELD[sortKey]];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [baseRows, sortKey, sortDir, lang]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'country' ? 'asc' : 'desc');
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'country', label: t('explorer.components.table.country') },
    { key: 'math', label: t(DOMAIN_LABEL_KEYS.math) },
    { key: 'reading', label: t(DOMAIN_LABEL_KEYS.reading) },
    { key: 'science', label: t(DOMAIN_LABEL_KEYS.science) },
  ];

  function ariaSort(key: SortKey): 'none' | 'ascending' | 'descending' {
    if (key !== sortKey) return 'none';
    return sortDir === 'asc' ? 'ascending' : 'descending';
  }

  function cell(v?: number) {
    return v == null ? (
      <span className="text-ink-400">{t('common.common.noData')}</span>
    ) : (
      <span className="font-medium tabular-nums">{Math.round(v)}</span>
    );
  }

  if (sorted.length === 0) {
    return <p className="py-8 text-center text-ink-600">{t('explorer.components.table.empty')}</p>;
  }

  return (
    <div className="data-scroll overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[560px] border-collapse bg-paper text-sm">
        <caption className="sr-only">
          {t('explorer.results.tableTitle')} — {year}
        </caption>
        <thead>
          <tr className="border-b border-line bg-mist text-left">
            <th scope="col" className="w-16 px-4 py-3 font-semibold text-ink-600">
              {t('explorer.components.table.rank')}
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={ariaSort(c.key)} className="px-4 py-2 font-semibold text-ink-600">
                <button
                  type="button"
                  onClick={() => toggleSort(c.key)}
                  aria-label={`${t('explorer.components.table.sortBy').replace('{column}', c.label)}${
                    c.key === sortKey
                      ? `, ${sortDir === 'asc' ? t('explorer.components.table.sortAsc') : t('explorer.components.table.sortDesc')}`
                      : ''
                  }`}
                  className="inline-flex items-center gap-1 hover:text-navy-900"
                >
                  {c.label}
                  <span aria-hidden="true" className="text-xs">
                    {c.key === sortKey ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const meta = getCountry(r.countryCode);
            const name = meta ? (lang === 'es' ? meta.nameEs : meta.nameEn) : r.countryCode;
            return (
              <tr
                key={r.countryCode}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-mist focus-within:bg-mist"
                onClick={() => navigate(`/country/${r.countryCode.toLowerCase()}`)}
              >
                <td className="px-4 py-2.5 tabular-nums text-ink-600">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <span className="mr-2" aria-hidden="true">
                    {meta ? flagEmoji(meta.flag) : ''}
                  </span>
                  <span className="font-medium text-navy-900 underline-offset-2 group-hover:underline">
                    {name}
                  </span>
                  <span className="sr-only">{t('explorer.components.table.openProfile').replace('{name}', name)}</span>
                </td>
                <td className="px-4 py-2.5">{cell(r.mathematics)}</td>
                <td className="px-4 py-2.5">{cell(r.reading)}</td>
                <td className="px-4 py-2.5">{cell(r.science)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
