import { useId, useState } from 'react';
import { useLang } from '../../i18n';
import { OECD_AVERAGE_CODE, getCountry, searchCountries } from '../../lib/oecd';
import { flagEmoji } from './flags';

interface CompareSelectorProps {
  value: string[];
  onChange: (codes: string[]) => void;
  max?: number;
  /** include the OECD-average pseudo-system as an addable option */
  allowOecdAverage?: boolean;
}

function label(code: string, lang: 'en' | 'es', t: (k: string) => string): string {
  if (code === OECD_AVERAGE_CODE) return t('explorer.components.compare.oecdAverage');
  const m = getCountry(code);
  if (!m) return code;
  return lang === 'es' ? m.nameEs : m.nameEn;
}

/** Multi-select country picker (chips), up to 5 systems. */
export function CompareSelector({
  value,
  onChange,
  max = 5,
  allowOecdAverage = true,
}: CompareSelectorProps) {
  const { t, lang } = useLang();
  const [query, setQuery] = useState('');
  const inputId = useId();

  const q = query.trim();
  const results =
    q.length >= 2
      ? searchCountries(q)
          .filter((c) => !value.includes(c.code))
          .slice(0, 6)
      : [];

  const showOecdOption =
    allowOecdAverage &&
    q.length >= 2 &&
    !value.includes(OECD_AVERAGE_CODE) &&
    t('explorer.components.compare.oecdAverage').toLowerCase().includes(q.toLowerCase());

  function add(code: string) {
    if (value.includes(code) || value.length >= max) return;
    onChange([...value, code]);
    setQuery('');
  }

  function remove(code: string) {
    onChange(value.filter((c) => c !== code));
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2" aria-live="polite">
        {value.map((code) => {
          const meta = getCountry(code);
          return (
            <span
              key={code}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 py-1 pl-3 pr-1.5 text-sm font-medium text-white"
            >
              {meta && <span aria-hidden="true">{flagEmoji(meta.flag)}</span>}
              <span>{label(code, lang, t)}</span>
              <button
                type="button"
                onClick={() => remove(code)}
                aria-label={t('explorer.components.compare.remove').replace('{name}', label(code, lang, t))}
                className="rounded-full p-0.5 hover:bg-navy-700"
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </span>
          );
        })}
      </div>
      <div className="relative max-w-md">
        <label htmlFor={inputId} className="sr-only">
          {t('explorer.components.compare.label')}
        </label>
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          value={query}
          disabled={value.length >= max}
          placeholder={t('explorer.components.compare.addPlaceholder')}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 disabled:opacity-50"
        />
        {value.length >= max && (
          <p className="mt-1 text-xs text-ink-600">{t('explorer.components.compare.maxReached')}</p>
        )}
        {q.length >= 2 && value.length < max && (
          <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-line bg-paper py-1 shadow-lg">
            {showOecdOption && (
              <li>
                <button
                  type="button"
                  onClick={() => add(OECD_AVERAGE_CODE)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-mist"
                >
                  <span aria-hidden="true" className="text-base">◈</span>
                  <span className="font-medium">{t('explorer.components.compare.oecdAverage')}</span>
                </button>
              </li>
            )}
            {results.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => add(c.code)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-mist"
                >
                  <span aria-hidden="true">{flagEmoji(c.flag)}</span>
                  <span className="font-medium">{lang === 'es' ? c.nameEs : c.nameEn}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && !showOecdOption && (
              <li className="px-4 py-2 text-sm text-ink-600">{t('explorer.components.search.noResults')}</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
