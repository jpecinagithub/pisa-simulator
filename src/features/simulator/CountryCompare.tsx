// Illustrative comparison: user's estimated scores vs PISA 2025 population
// averages (country + OECD). Carries the "not statistically equivalent"
// disclaimer at all times.
import { useEffect, useMemo, useState } from 'react';
import type { Domain } from '../../types/oecd';
import type { TestResult } from '../../types/simulator';
import { useLang } from '../../i18n';
import { trackEvent } from '../../lib/analytics';
import {
  countryName,
  flagEmoji,
  getCompareData,
  scoreOf,
  type CountryScoreRow,
} from './oecdSource';
import { domainName, domainStyle } from './shared';

const DOMAINS: Domain[] = ['math', 'reading', 'science'];

export function CountryCompare({ result }: { result: TestResult }) {
  const { t, lang } = useLang();
  const [countries, setCountries] = useState<CountryScoreRow[]>([]);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    let cancelled = false;
    getCompareData().then((d) => {
      if (cancelled) return;
      setCountries(d.countries);
      setLive(d.live);
      const esp = d.countries.find((c) => c.code === 'ESP');
      setSelected(esp ? esp.code : (d.countries[0]?.code ?? ''));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const country = useMemo(
    () => countries.find((c) => c.code === selected),
    [countries, selected],
  );

  function onSelect(code: string) {
    setSelected(code);
    trackEvent('country_compared', { code });
  }

  return (
    <div>
      <label htmlFor="sim-compare-country" className="block text-sm font-semibold text-ink-900">
        {t('sim.results.compareCountry')}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <select
          id="sim-compare-country"
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          className="min-w-[220px] rounded-xl border border-line bg-paper px-4 py-2.5 text-base text-ink-900"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {flagEmoji(c.flag)} {countryName(c, lang)}
            </option>
          ))}
        </select>
        {!live && (
          <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
            {t('sim.results.dataUnavailable')}
          </span>
        )}
      </div>

      {country && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="bg-mist text-left">
                <th scope="col" className="px-4 py-2.5 font-semibold text-ink-900">{t('sim.results.compareTitle')}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold text-ink-900">{t('sim.results.compareYour')}</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold text-ink-900">
                  {t('sim.results.compareCountryScore').replace('{name}', countryName(country, lang))}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold text-ink-900">{t('sim.results.compareOecd')}</th>
              </tr>
            </thead>
            <tbody>
              {DOMAINS.map((d) => {
                const st = domainStyle(d);
                const cScore = scoreOf(country, d);
                return (
                  <tr key={d} className="border-t border-line">
                    <th scope="row" className="px-4 py-2.5 text-left font-medium text-ink-900">
                      <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${st.bg}`} aria-hidden="true" />
                      {domainName(d, t)}
                    </th>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-navy-900">
                      {Math.round(result.domains[d].score)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-600">
                      {cScore === undefined ? t('common.noData') : Math.round(cScore)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-600">
                      {oecd2025(d)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-ink-600">{t('sim.results.compareDisclaimer')}</p>
      <p className="mt-1 text-xs text-ink-400">{t('sim.results.compareNote')}</p>
    </div>
  );
}

// Official PISA 2025 OECD averages (project spec; DATA agent to confirm).
function oecd2025(d: Domain): number {
  return d === 'math' ? 463 : d === 'reading' ? 461 : 482;
}
