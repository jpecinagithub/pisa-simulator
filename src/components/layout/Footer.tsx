import { Link } from 'react-router-dom';
import { useLang } from '../../i18n';

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="border-t border-line bg-navy-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="max-w-3xl text-[13px] leading-relaxed text-slate-400">
          {t('common.disclaimer.short')}
        </p>
        <div className="mt-6 flex flex-col gap-4 border-t border-white/10 pt-6 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('common.footer.author')} ·{' '}
            <a href="mailto:jpecina@gmail.com" className="underline underline-offset-2 hover:text-white">
              jpecina@gmail.com
            </a>
          </p>
          <p className="text-slate-500">
            {t('common.footer.rights')} · {t('common.footer.sourceNote')}
          </p>
          <Link to="/methodology" className="underline underline-offset-2 hover:text-white">
            {t('common.nav.methodology')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
