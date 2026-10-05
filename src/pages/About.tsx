import { useLang } from '../i18n';
import { usePageMeta } from '../features/explorer/usePageMeta';

export default function About() {
  const { t } = useLang();
  usePageMeta(t('explorer.about.metaTitle'), t('explorer.about.metaDescription'));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-navy-950">{t('explorer.about.title')}</h1>
      <div className="mt-6 max-w-3xl space-y-4 text-ink-600">
        <p>{t('explorer.about.p1')}</p>
        <p>{t('explorer.about.p2')}</p>
      </div>

      {/* Full independence disclaimer, both languages, verbatim from spec */}
      <section aria-labelledby="disclaimer" className="mt-10 rounded-2xl border-2 border-navy-900 bg-paper p-6 md:p-8">
        <h2 id="disclaimer" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.about.disclaimerTitle')}
        </h2>
        <blockquote className="mt-4 border-l-4 border-accent pl-4 text-ink-600">
          <p lang="en">{t('explorer.about.disclaimerEn')}</p>
        </blockquote>
        <blockquote className="mt-4 border-l-4 border-accent pl-4 text-ink-600">
          <p lang="es">{t('explorer.about.disclaimerEs')}</p>
        </blockquote>
      </section>

      {/* Author credit */}
      <section aria-labelledby="author" className="mt-10">
        <h2 id="author" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.about.authorTitle')}
        </h2>
        <div className="mt-4 rounded-2xl border border-line bg-mist p-6">
          <p className="font-display text-xl font-bold text-navy-950">{t('explorer.about.authorName')}</p>
          <p className="text-sm text-ink-600">{t('explorer.about.authorRole')}</p>
          <p className="mt-2 text-sm text-ink-600">
            <a href="mailto:jpecina@gmail.com" className="font-medium text-accent-dark hover:underline">
              jpecina@gmail.com
            </a>
          </p>
          <p className="mt-2 text-sm text-ink-600">{t('explorer.about.authorNote')}</p>
        </div>
      </section>
    </div>
  );
}
