import { useLang } from '../i18n';
import { usePageMeta } from '../features/explorer/usePageMeta';

function ListSection({ title, keys, prefix }: { title: string; keys: string[]; prefix: string }) {
  const { t } = useLang();
  return (
    <section aria-labelledby={prefix} className="mt-10">
      <h2 id={prefix} className="font-display text-2xl font-bold text-navy-950">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">
        {keys.map((k) => (
          <li key={k} className="flex items-start gap-3 rounded-xl border border-line bg-paper p-4">
            <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
            <span className="text-ink-600">{t(k)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Methodology() {
  const { t } = useLang();
  usePageMeta(t('explorer.methodology.metaTitle'), t('explorer.methodology.metaDescription'));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-navy-950">{t('explorer.methodology.title')}</h1>
      <p className="mt-3 text-ink-600">{t('explorer.methodology.intro')}</p>

      <ListSection
        title={t('explorer.methodology.fromOecdTitle')}
        prefix="from-oecd"
        keys={[0, 1, 2, 3].map((i) => `explorer.methodology.fromOecd${i}`)}
      />
      <ListSection
        title={t('explorer.methodology.calculatedTitle')}
        prefix="calculated"
        keys={[0, 1, 2].map((i) => `explorer.methodology.calculated${i}`)}
      />
      <ListSection
        title={t('explorer.methodology.simulatedTitle')}
        prefix="simulated"
        keys={[0, 1, 2].map((i) => `explorer.methodology.simulated${i}`)}
      />

      {/* Scoring explanation */}
      <section aria-labelledby="scoring" className="mt-10 rounded-2xl border border-line bg-mist p-6 md:p-8">
        <h2 id="scoring" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.methodology.scoringTitle')}
        </h2>
        <div className="mt-4 space-y-4 text-ink-600">
          <p>{t('explorer.methodology.scoringP1')}</p>
          <p>{t('explorer.methodology.scoringP2')}</p>
          <p className="font-semibold text-navy-900">{t('explorer.methodology.scoringP3')}</p>
        </div>
      </section>

      <ListSection
        title={t('explorer.methodology.limitsTitle')}
        prefix="limits"
        keys={[0, 1, 2].map((i) => `explorer.methodology.limits${i}`)}
      />

      {/* Primary sources */}
      <section aria-labelledby="sources" className="mt-10">
        <h2 id="sources" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.methodology.sourcesTitle')}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-ink-600">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i}>{t(`explorer.methodology.sources${i}`)}</li>
          ))}
        </ol>
        <p className="mt-6 rounded-xl bg-navy-950 p-4 text-sm font-medium text-white">
          {t('explorer.methodology.dataNote')}
        </p>
      </section>
    </div>
  );
}
