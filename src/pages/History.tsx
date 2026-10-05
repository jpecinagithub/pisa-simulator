import { useState } from 'react';
import { useLang } from '../i18n';
import { getTimeline } from '../lib/oecd';
import { CycleTimeline } from '../features/explorer/CycleTimeline';
import { usePageMeta } from '../features/explorer/usePageMeta';

export default function History() {
  const { t, lang } = useLang();
  usePageMeta(t('explorer.history.metaTitle'), t('explorer.history.metaDescription'));
  const [selected, setSelected] = useState<number | null>(2025);

  const entries = getTimeline();
  const entry = entries.find((e) => e.year === selected);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-navy-950">{t('explorer.history.title')}</h1>
      <p className="mt-3 max-w-3xl text-ink-600">{t('explorer.history.intro')}</p>

      {/* COVID note */}
      <aside className="mt-6 rounded-2xl border border-line bg-mist p-5">
        <h2 className="font-semibold text-navy-900">{t('explorer.history.covidTitle')}</h2>
        <p className="mt-2 text-sm text-ink-600">{t('explorer.history.covidText')}</p>
      </aside>

      {/* Timeline */}
      <section aria-label={t('explorer.history.title')} className="mt-10">
        <CycleTimeline selected={selected} onSelect={setSelected} />
      </section>

      {/* Detail panel */}
      <section aria-live="polite" className="mt-8">
        {entry ? (
          <article className="rounded-2xl border border-line bg-paper p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-baseline gap-4">
              <h2 className="font-display text-4xl font-bold tabular-nums text-navy-950">{entry.year}</h2>
              <p className="text-lg font-medium text-navy-800">
                {t('explorer.history.majorDomain')}: {lang === 'es' ? entry.majorDomainEs : entry.majorDomain}
              </p>
            </div>
            <p className="mt-2 text-ink-600">
              <span className="font-semibold text-navy-900 tabular-nums">{entry.participants}</span>{' '}
              {t('explorer.history.participants')}
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold text-navy-900">{t('explorer.history.innovations')}</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink-600">
                  {(lang === 'es' ? entry.innovationsEs : entry.innovationsEn).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-navy-900">{t('explorer.history.trends')}</h3>
                <p className="mt-2 text-sm text-ink-600">{lang === 'es' ? entry.trendsEs : entry.trendsEn}</p>
              </div>
            </div>
            <p className="mt-6 text-xs text-ink-400">{t('explorer.components.sourceNote')}</p>
          </article>
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-ink-600">
            {t('explorer.history.selectPrompt')}
          </p>
        )}
      </section>
    </div>
  );
}
