import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { usePageMeta } from '../features/explorer/usePageMeta';

export default function NotFound() {
  const { t } = useLang();
  usePageMeta(t('explorer.notfound.metaTitle'), t('explorer.notfound.metaDescription'));

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-display text-7xl font-bold text-navy-900" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold text-navy-950">
        {t('explorer.notfound.title')}
      </h1>
      <p className="mt-3 text-ink-600">{t('explorer.notfound.message')}</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-xl bg-navy-900 px-6 py-3 font-semibold text-white hover:bg-navy-800"
      >
        {t('explorer.notfound.homeLink')}
      </Link>
    </div>
  );
}
