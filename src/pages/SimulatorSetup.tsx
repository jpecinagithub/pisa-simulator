// /pisa-simulator — setup form + unfinished-session resume banner.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestSession } from '../types/simulator';
import { useLang } from '../i18n';
import { clearSession, loadSession } from '../lib/simulator/session';
import { SetupForm } from '../features/simulator/SetupForm';

export default function SimulatorSetup() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [unfinished, setUnfinished] = useState<TestSession | null>(() => {
    const s = loadSession();
    return s && !s.finishedAt ? s : null;
  });

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
