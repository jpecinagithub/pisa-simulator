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

      {/* Author bio */}
      <section aria-labelledby="author" className="mt-10">
        <h2 id="author" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.about.authorTitle')}
        </h2>
        <div className="mt-4 rounded-2xl border border-line bg-mist p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-navy-900 font-display text-2xl font-bold text-white"
            >
              JP
            </span>
            <div>
              <p className="font-display text-xl font-bold text-navy-950">{t('explorer.about.authorName')}</p>
              <p className="text-sm text-ink-600">{t('explorer.about.authorRole')}</p>
            </div>
          </div>
          <div className="mt-4 space-y-3 leading-relaxed text-ink-600">
            <p>{t('explorer.about.authorBio1')}</p>
            <p>{t('explorer.about.authorBio2')}</p>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-ink-400">
              {t('explorer.about.authorContact')}
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li>
                <a href="mailto:jpecina@gmail.com" className="font-medium text-accent-dark hover:underline">
                  jpecina@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jpecinagithub"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-accent-dark hover:underline"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/jpecina/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-accent-dark hover:underline"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
            <p className="mt-3 text-sm text-ink-600">{t('explorer.about.authorNote')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
