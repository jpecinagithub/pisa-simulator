import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useLang } from '../../i18n';
import { trackEvent } from '../../lib/analytics';

const NAV = [
  { to: '/', key: 'nav.home' },
  { to: '/what-is-pisa', key: 'nav.whatIsPisa' },
  { to: '/pisa-history', key: 'nav.history' },
  { to: '/results', key: 'nav.globalResults' },
  { to: '/countries', key: 'nav.countryExplorer' },
  { to: '/pisa-simulator', key: 'nav.simulator' },
  { to: '/leaderboard', key: 'nav.leaderboard' },
  { to: '/methodology', key: 'nav.methodology' },
  { to: '/about', key: 'nav.about' },
] as const;

export function Header() {
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const inTest = location.pathname.startsWith('/simulator/test');

  const switchLang = (l: 'en' | 'es') => {
    if (l !== lang) {
      setLang(l);
      trackEvent('language_changed', { lang: l });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-navy-900 focus:px-3 focus:py-2 focus:text-white"
      >
        {t('common.a11y.skipToContent')}
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="PISA Simulator — Home">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 font-display text-lg font-bold text-white"
          >
            π
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-bold text-navy-900">PISA Simulator</span>
            <span className="block text-[11px] uppercase tracking-widest text-ink-400">Global Explorer</span>
          </span>
        </Link>

        {!inTest && (
          <nav aria-label={t('common.a11y.mainNav')} className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                    isActive ? 'bg-mist text-navy-900' : 'text-ink-600 hover:bg-mist hover:text-navy-900'
                  }`
                }
              >
                {t(`common.${n.key}`)}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label={t('common.a11y.languageSelector')}
            className="flex overflow-hidden rounded-md border border-line text-[13px] font-semibold"
          >
            {(['en', 'es'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => switchLang(l)}
                aria-pressed={lang === l}
                className={`px-2.5 py-1.5 uppercase tracking-wide ${
                  lang === l ? 'bg-navy-900 text-white' : 'bg-paper text-ink-600 hover:bg-mist'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {!inTest && (
            <button
              type="button"
              className="rounded-md border border-line p-2 text-ink-600 lg:hidden"
              aria-expanded={open}
              aria-label="Menu"
              onClick={() => setOpen((o) => !o)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {open && !inTest && (
        <nav aria-label={t('common.a11y.mainNav')} className="border-t border-line bg-paper px-4 py-2 lg:hidden">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2.5 text-[15px] font-medium ${
                  isActive ? 'bg-mist text-navy-900' : 'text-ink-600'
                }`
              }
            >
              {t(`common.${n.key}`)}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
