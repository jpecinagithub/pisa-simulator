// /pisa-simulator/history — per-browser history of finished PISA-style reports.
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { TestResult } from '../types/simulator';
import { useLang } from '../i18n';
import { usePageMeta } from '../features/explorer/usePageMeta';
import { downloadPdf } from '../lib/pdf/report';
import { domainName } from '../features/simulator/shared';
import {
  clearReportHistory,
  listReportHistory,
  removeReportHistory,
} from '../lib/simulator/history';

const LAST_RESULT_KEY = 'pisa-simulator:last-result';

function formatDate(iso: string, lang: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReportHistory() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TestResult[]>(() => listReportHistory());
  const [pdfError, setPdfError] = useState<string | null>(null);

  usePageMeta(t('sim.history.title'), t('sim.history.subtitle'));

  const onView = useCallback(
    (entry: TestResult) => {
      try {
        localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(entry));
      } catch {
        /* ignore — results page shows its empty state */
      }
      navigate('/pisa-simulator/results');
    },
    [navigate],
  );

  const onDownload = useCallback((entry: TestResult) => {
    setPdfError(null);
    try {
      downloadPdf(entry, {});
    } catch {
      setPdfError(entry.sessionId);
    }
  }, []);

  const onDelete = useCallback(
    (entry: TestResult) => {
      if (!window.confirm(t('sim.history.confirmDelete'))) return;
      setEntries(removeReportHistory(entry.sessionId));
    },
    [t],
  );

  const onClearAll = useCallback(() => {
    if (!window.confirm(t('sim.history.confirmClearAll'))) return;
    clearReportHistory();
    setEntries([]);
  }, [t]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy-900">{t('sim.history.title')}</h1>
          <p className="mt-2 max-w-2xl text-ink-600">{t('sim.history.subtitle')}</p>
          <p className="mt-1 text-xs text-ink-400">{t('sim.history.browserNote')}</p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-600 hover:border-red-300 hover:text-red-700"
          >
            {t('sim.history.clearAll')}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-line bg-mist/60 p-10 text-center">
          <p className="text-ink-600">{t('sim.history.empty')}</p>
          <Link
            to="/pisa-simulator"
            className="mt-5 inline-block rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
          >
            {t('sim.history.startCta')}
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {entries.map((e) => (
            <li key={e.sessionId} className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-navy-900/10 px-3 py-1 text-xs font-semibold text-navy-900">
                      {t(`sim.setup.modes.${e.testMode}.name`)}
                    </span>
                    <span className="text-xs text-ink-400">
                      {formatDate(e.dateISO, lang)} · {e.participantName}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-bold text-navy-900">{e.overall}</span>
                    <span className="text-sm text-ink-600">
                      {t('sim.history.overall')} · {t('sim.results.estimatedScore')}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">
                    {(['math', 'reading', 'science'] as const).map((d) => (
                      <span key={d}>
                        {domainName(d, t)}: <strong className="text-ink-900">{e.domains[d].score}</strong>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={() => onView(e)}
                    className="rounded-xl bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                  >
                    {t('sim.history.view')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(e)}
                    className="rounded-xl border border-line px-5 py-2 text-sm font-semibold text-ink-900 hover:border-navy-900"
                  >
                    {t('sim.history.download')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(e)}
                    className="rounded-xl px-5 py-2 text-sm font-medium text-ink-400 hover:text-red-700"
                  >
                    {t('sim.history.delete')}
                  </button>
                </div>
              </div>
              {pdfError === e.sessionId && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {t('sim.history.pdfError')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
