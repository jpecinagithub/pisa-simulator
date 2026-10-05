import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { listCountries } from '../lib/oecd';
import { CountrySearch } from '../features/explorer/CountrySearch';
import { flagEmoji } from '../features/explorer/flags';
import { usePageMeta } from '../features/explorer/usePageMeta';

export default function Countries() {
  const { t, lang } = useLang();
  usePageMeta(t('explorer.countries.metaTitle'), t('explorer.countries.metaDescription'));

  const countries = useMemo(() => listCountries(), []);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof countries>();
    for (const c of countries) {
      const name = lang === 'es' ? c.nameEs : c.nameEn;
      const letter = name.charAt(0).toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(c);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) =>
        (lang === 'es' ? a.nameEs : a.nameEn).localeCompare(lang === 'es' ? b.nameEs : b.nameEn),
      );
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [countries, lang]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-navy-950">{t('explorer.countries.title')}</h1>
      <p className="mt-3 max-w-3xl text-ink-600">{t('explorer.countries.intro')}</p>

      <div className="mt-6">
        <CountrySearch autoFocus={false} />
      </div>

      <section aria-labelledby="az" className="mt-10">
        <h2 id="az" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.countries.azTitle')}
        </h2>
        <p className="mt-1 text-sm text-ink-600">
          {t('explorer.countries.countLabel').replace('{count}', String(countries.length))}
        </p>
        <div className="mt-6 space-y-8">
          {grouped.map(([letter, list]) => (
            <div key={letter}>
              <h3 className="mb-3 font-display text-xl font-bold text-navy-900" aria-label={letter}>
                {letter}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <li key={c.code}>
                    <Link
                      to={`/country/${c.code.toLowerCase()}`}
                      className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 shadow-sm transition-colors hover:border-navy-700 hover:bg-mist"
                    >
                      <span aria-hidden="true" className="text-xl leading-none">{flagEmoji(c.flag)}</span>
                      <span className="font-medium text-ink-900">{lang === 'es' ? c.nameEs : c.nameEn}</span>
                      {c.oecd && (
                        <span className="ml-auto rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-navy-800">
                          OECD
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
