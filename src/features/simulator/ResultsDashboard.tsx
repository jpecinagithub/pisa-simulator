// Personal results dashboard after a completed simulation.
import { Suspense, lazy, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Domain } from '../../types/oecd';
import type { TestResult, TestSession } from '../../types/simulator';
import { useLang } from '../../i18n';
import { downloadPdf } from '../../lib/pdf/report';
import { Card, CompetencyBars, DisclaimerBanner, SectionTitle, domainName, domainStyle } from './shared';
import { LeaderboardConsent } from './LeaderboardConsent';
import { QuestionReview } from './QuestionReview';

const CountryCompare = lazy(() => import('./CountryCompare').then((m) => ({ default: m.CountryCompare })));
const HistoryChartSection = lazy(() =>
  import('./HistoryChart').then((m) => ({ default: m.HistoryChartSection })),
);

const RESULT_KEY = 'pisa-simulator:last-result';
const SESSION_BACKUP_KEY = 'pisa-simulator:last-session';
const DOMAINS: Domain[] = ['math', 'reading', 'science'];

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function ChartFallback({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-ink-600" aria-busy="true">
      {t('common.loading')}
    </div>
  );
}

export function ResultsDashboard() {
  const { t, lang } = useLang();
  const [showReview, setShowReview] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const result = useMemo(() => loadJson<TestResult>(RESULT_KEY), []);
  const backupSession = useMemo(() => loadJson<TestSession>(SESSION_BACKUP_KEY), []);

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold text-navy-900">{t('sim.results.noResultTitle')}</h1>
        <p className="mt-3 text-ink-600">{t('sim.results.noResultText')}</p>
        <Link
          to="/pisa-simulator"
          className="mt-6 inline-block rounded-xl bg-navy-900 px-8 py-3 text-base font-semibold text-white hover:bg-navy-800"
        >
          {t('sim.results.goToSimulator')}
        </Link>
      </div>
    );
  }

  // From here on, `result` is non-null.
  const res: TestResult = result;

  const dateStr = new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(res.dateISO));

  function levelLabel(d: Domain): string {
    const lvl = res.domains[d].level;
    if (lvl <= 0) return t('sim.results.belowLevel1');
    if (lvl >= 7) return t('sim.results.aboveLevel6');
    return t('sim.results.levelLabel').replace('{n}', String(lvl));
  }

  function levelDescriptor(d: Domain): string {
    const lvl = res.domains[d].level;
    const clamped = Math.min(6, Math.max(1, lvl));
    return t(`sim.levels.${d}.${clamped}`);
  }

  function onDownloadPdf() {
    setPdfError(false);
    try {
      downloadPdf(res, {});
    } catch {
      setPdfError(true);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <DisclaimerBanner text={t('sim.results.disclaimerShort')} />

      {/* header */}
      <header>
        <h1 className="font-display text-3xl font-semibold text-navy-900 sm:text-4xl">{t('sim.results.title')}</h1>
        <p className="mt-2 text-lg text-ink-600">
          {res.participantName} · {dateStr}
        </p>
      </header>

      {/* overall indicator */}
      <Card className="bg-navy-900 text-white">
        <p className="text-sm font-medium uppercase tracking-wider text-white/70">{t('sim.results.overallIndicator')}</p>
        <p className="mt-1 font-display text-6xl font-semibold tabular-nums">{Math.round(res.overall)}</p>
        <p className="mt-2 text-sm text-white/80">
          {t('sim.results.indicativeRange')}: {Math.round(res.overallRange[0])}–{Math.round(result.overallRange[1])}
        </p>
        <p className="mt-1 text-xs text-white/60">{t('sim.results.rangeNote')}</p>
      </Card>

      {/* domain cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {DOMAINS.map((d) => {
          const ds = res.domains[d];
          const st = domainStyle(d);
          const isStrongest = res.strongest === d;
          const isWeakest = res.weakest === d;
          return (
            <Card key={d}>
              <div className="flex items-center justify-between">
                <h2 className={`text-base font-bold uppercase tracking-wide ${st.text}`}>{domainName(d, t)}</h2>
                <span className={`h-3 w-3 rounded-full ${st.bg}`} aria-hidden="true" />
              </div>
              <p className="mt-2 font-display text-5xl font-semibold tabular-nums text-navy-900">
                {Math.round(ds.score)}
              </p>
              <p className="mt-1 text-sm text-ink-600">{t('sim.results.estimatedScore')}</p>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-600">{t('sim.results.estimatedLevel')}</dt>
                  <dd className="font-semibold text-ink-900">{levelLabel(d)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-600">{t('sim.results.indicativeRange')}</dt>
                  <dd className="font-medium tabular-nums text-ink-900">
                    {Math.round(ds.range[0])}–{Math.round(ds.range[1])}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {isStrongest && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    {t('sim.results.strongest')}
                  </span>
                )}
                {isWeakest && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                    {t('sim.results.weakest')}
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* competency profiles + proficiency meaning */}
      <div className="grid gap-4 lg:grid-cols-3">
        {DOMAINS.map((d) => {
          const ds = res.domains[d];
          const entries = Object.entries(ds.competencies)
            .map(([key, value]) => ({ key, label: t(`sim.competencies.${key}`), value }))
            .sort((a, b) => b.value - a.value);
          return (
            <Card key={d}>
              <h2 className="text-base font-semibold text-navy-900">
                {domainName(d, t)} — {t('sim.results.competencyProfile')}
              </h2>
              <div className="mt-4">
                <CompetencyBars entries={entries} compact />
              </div>
              <h3 className="mt-5 text-sm font-semibold text-navy-900">{t('sim.results.whatThisMeans')}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{levelDescriptor(d)}</p>
            </Card>
          );
        })}
      </div>

      {/* country comparison */}
      <Card aria-labelledby="sim-compare-h">
        <h2 id="sim-compare-h" className="mb-4">
          <SectionTitle>{t('sim.results.compareTitle')}</SectionTitle>
        </h2>
        <Suspense fallback={<ChartFallback t={t} />}>
          <CountryCompare result={res} />
        </Suspense>
      </Card>

      {/* historical chart */}
      <Card aria-labelledby="sim-history-h">
        <h2 id="sim-history-h" className="mb-4">
          <SectionTitle>{t('sim.results.historyTitle')}</SectionTitle>
        </h2>
        <Suspense fallback={<ChartFallback t={t} />}>
          <HistoryChartSection result={res} />
        </Suspense>
      </Card>

      {/* actions */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDownloadPdf}
            className="rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
          >
            {t('sim.results.downloadPdf')}
          </button>
          {backupSession && (
            <button
              type="button"
              onClick={() => setShowReview((v) => !v)}
              className="rounded-xl border border-line px-6 py-3 text-sm font-semibold text-ink-900"
              aria-expanded={showReview}
            >
              {showReview ? t('sim.results.hideReview') : t('sim.results.reviewAnswers')}
            </button>
          )}
          <Link
            to="/pisa-simulator"
            className="rounded-xl border border-line px-6 py-3 text-sm font-semibold text-ink-900"
          >
            {t('sim.results.retake')}
          </Link>
          <Link
            to="/pisa-simulator/history"
            className="rounded-xl border border-line px-6 py-3 text-sm font-semibold text-ink-900"
          >
            {t('sim.history.title')}
          </Link>
        </div>
        {pdfError && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">
            PDF generation failed. / Error al generar el PDF.
          </p>
        )}
        <p className="mt-3 text-xs text-ink-400">{t('sim.results.sourceNote')}</p>
      </Card>

      <LeaderboardConsent result={res} />

      {showReview && backupSession && <QuestionReview session={backupSession} />}
    </div>
  );
}
