import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { WorldGrid } from '../features/explorer/WorldGrid';
import { usePageMeta } from '../features/explorer/usePageMeta';

function useCountUp(target: number, started: boolean, duration = 1400): number {
  const [value, setValue] = useState(0);
  const reduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  useEffect(() => {
    if (!started || reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration, reduced]);
  return reduced && started ? target : value;
}

export default function Home() {
  const { t, lang } = useLang();
  usePageMeta(t('explorer.home.metaTitle'), t('explorer.home.metaDescription'));

  const statsRef = useRef<HTMLElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStatsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const countries = useCountUp(91, statsVisible);
  const students = useCountUp(760000, statsVisible);
  const age = useCountUp(15, statsVisible);
  const fmt = (n: number) => new Intl.NumberFormat(lang).format(n);

  const domains = [
    {
      key: 'math',
      title: t('explorer.results.domainMath'),
      desc: t('explorer.home.domainMathDesc'),
      color: 'bg-[#2563eb]',
    },
    {
      key: 'reading',
      title: t('explorer.results.domainReading'),
      desc: t('explorer.home.domainReadingDesc'),
      color: 'bg-[#b45309]',
    },
    {
      key: 'science',
      title: t('explorer.results.domainScience'),
      desc: t('explorer.home.domainScienceDesc'),
      color: 'bg-[#059669]',
    },
    {
      key: 'digital',
      title: t('explorer.home.domainDigitalTitle'),
      desc: t('explorer.home.domainDigitalDesc'),
      color: 'bg-[#7c3aed]',
      badge: t('explorer.home.domainDigitalBadge'),
    },
  ];

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="border-b border-line bg-mist">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">
            {t('explorer.home.kicker')}
          </p>
          <h1 className="font-display text-4xl font-bold text-navy-950 md:text-6xl">
            {t('explorer.home.title')}
          </h1>
          <p className="mt-4 max-w-2xl font-display text-xl text-navy-800 md:text-2xl">
            {t('explorer.home.subtitle')}
          </p>
          <p className="mt-4 max-w-2xl text-ink-600">{t('explorer.home.intro')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/pisa-simulator"
              className="rounded-xl bg-navy-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-navy-800"
            >
              {t('explorer.home.ctaStart')}
            </Link>
            <Link
              to="/results"
              className="rounded-xl border border-navy-900 bg-paper px-6 py-3 font-semibold text-navy-900 hover:bg-mist"
            >
              {t('explorer.home.ctaExplore')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Animated stats ───────────────────────────────── */}
      <section ref={statsRef} aria-label={t('explorer.home.statsTitle')} className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="font-display text-2xl font-bold text-navy-950">{t('explorer.home.statsTitle')}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="font-display text-4xl font-bold tabular-nums text-navy-950" aria-live="polite">
                {fmt(countries)}
              </p>
              <p className="mt-1 text-sm text-ink-600">{t('explorer.home.statCountries')}</p>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="font-display text-4xl font-bold tabular-nums text-navy-950" aria-live="polite">
                {fmt(students)}+
              </p>
              <p className="mt-1 text-sm text-ink-600">{t('explorer.home.statStudents')}</p>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="font-display text-4xl font-bold tabular-nums text-navy-950" aria-live="polite">
                {fmt(age)}
              </p>
              <p className="mt-1 text-sm text-ink-600">
                {t('explorer.home.statAge')} <span className="text-ink-400">({t('explorer.home.statAgeNote')})</span>
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="font-display text-4xl font-bold text-navy-950">{t('explorer.results.domainScience')}</p>
              <p className="mt-1 text-sm text-ink-600">{t('explorer.home.statDomain')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Domain cards ─────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-navy-950">{t('explorer.home.domainsTitle')}</h2>
        <p className="mt-2 max-w-3xl text-ink-600">{t('explorer.home.domainsSubtitle')}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {domains.map((d) => (
            <article key={d.key} className="flex flex-col rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <span aria-hidden="true" className={`mb-3 h-2 w-10 rounded-full ${d.color}`} />
              <h3 className="font-display text-lg font-semibold text-navy-950">{d.title}</h3>
              {d.badge && (
                <span className="mt-1 inline-block w-fit rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-navy-800">
                  {d.badge}
                </span>
              )}
              <p className="mt-2 flex-1 text-sm text-ink-600">{d.desc}</p>
              <Link to="/what-is-pisa" className="mt-4 text-sm font-semibold text-accent-dark hover:underline">
                {t('explorer.home.learnMore')} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ── World grid ───────────────────────────────────── */}
      <section className="border-y border-line bg-mist">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="font-display text-2xl font-bold text-navy-950">{t('explorer.home.worldTitle')}</h2>
          <p className="mt-2 max-w-3xl text-ink-600">{t('explorer.home.worldSubtitle')}</p>
          <div className="mt-6">
            <WorldGrid year={2025} />
          </div>
          <div className="mt-6 text-center">
            <Link
              to="/countries"
              className="inline-block rounded-xl border border-navy-900 bg-paper px-6 py-3 font-semibold text-navy-900 hover:bg-white"
            >
              {t('explorer.home.viewAllCountries')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA + disclaimer ─────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-2xl bg-navy-950 p-8 text-white md:p-12">
          <h2 className="font-display text-2xl font-bold md:text-3xl">{t('explorer.home.resultsCtaTitle')}</h2>
          <p className="mt-3 max-w-2xl text-white/80">{t('explorer.home.resultsCtaText')}</p>
          <Link
            to="/pisa-simulator"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-navy-950 hover:bg-mist"
          >
            {t('explorer.home.ctaStart')}
          </Link>
        </div>
        <p className="mt-8 border-t border-line pt-6 text-center text-sm text-ink-400">
          {t('explorer.home.disclaimerStrip')}
        </p>
      </section>
    </div>
  );
}
