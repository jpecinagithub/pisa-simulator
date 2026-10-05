// /pisa-simulator — setup form + unfinished-session resume banner.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { TestSession } from '../types/simulator';
import { useLang } from '../i18n';
import { clearSession, loadSession } from '../lib/simulator/session';
import { listReportHistory } from '../lib/simulator/history';
import { SetupForm } from '../features/simulator/SetupForm';

export default function SimulatorSetup() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [unfinished, setUnfinished] = useState<TestSession | null>(() => {
    const s = loadSession();
    return s && !s.finishedAt ? s : null;
  });
  const [historyCount] = useState(() => listReportHistory().length);

  function discard() {
    if (unfinished) {
      try {
        localStorage.removeItem(`pisa-simulator:stage:${unfinished.sessionId}`);
      } catch {
        /* ignore */
      }
    }
    clearSession();
    setUnfinished(null);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {historyCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-4 shadow-sm">
          <p className="text-sm text-ink-600">
            {t('sim.history.countLine').replace('{n}', String(historyCount))}
          </p>
          <Link
            to="/pisa-simulator/history"
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-navy-900 hover:border-navy-900"
          >
            {t('sim.history.title')} →
          </Link>
        </div>
      )}
      {unfinished && (
        <div
          role="alert"
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-navy-900/20 bg-mist p-5 sm:flex-row sm:items-center"
        >
          <div className="flex-1">
            <p className="font-semibold text-navy-900">{t('sim.setup.resumeTitle')}</p>
            <p className="mt-1 text-sm text-ink-600">{t('sim.setup.resumeText')}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/pisa-simulator/test')}
              className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              {t('sim.setup.resume')}
            </button>
            <button
              type="button"
              onClick={discard}
              className="rounded-xl border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-ink-900"
            >
              {t('sim.setup.discard')}
            </button>
          </div>
        </div>
      )}
      <SetupForm />
    </div>
  );
}
