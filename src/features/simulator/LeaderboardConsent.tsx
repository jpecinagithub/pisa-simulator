// Explicit opt-in for the global leaderboard. Default: NOT published.
// Shows exactly what will be published before asking.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { TestResult } from '../../types/simulator';
import { useLang } from '../../i18n';
import { trackEvent } from '../../lib/analytics';
import { submitScore } from '../../lib/leaderboard';
import { Card } from './shared';

type Status = 'idle' | 'submitting' | 'done' | 'error' | 'duplicate';

export function LeaderboardConsent({ result }: { result: TestResult }) {
  const { t, tx } = useLang();
  const [status, setStatus] = useState<Status>('idle');
  const [declined, setDeclined] = useState(false);

  async function publish() {
    setStatus('submitting');
    try {
      await submitScore(result);
      setStatus('done');
      trackEvent('leaderboard_opt_in');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'duplicate') setStatus('duplicate');
      else if (msg === 'rate_limited') setStatus('error');
      else setStatus('error');
    }
  }

  if (status === 'done' || status === 'duplicate') {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <p role="status" className="font-medium text-emerald-900">
          {status === 'done' ? t('sim.consent.success') : t('sim.consent.already')}
        </p>
        <Link to="/leaderboard" className="mt-2 inline-block text-sm font-semibold text-navy-900 underline">
          {t('sim.consent.viewBoard')}
        </Link>
      </Card>
    );
  }

  if (declined) return null;

  return (
    <Card aria-labelledby="sim-consent-title">
      <h2 id="sim-consent-title" className="text-lg font-semibold text-navy-900">
        {t('sim.consent.title')}
      </h2>
      <p className="mt-1 text-sm text-ink-600">{t('sim.consent.question')}</p>
      <p className="mt-1 text-sm font-medium text-ink-900">{t('sim.consent.note')}</p>

      <div className="mt-4 rounded-xl border border-line bg-mist/60 px-4 py-3 text-sm">
        <p className="font-semibold text-ink-900">{t('sim.consent.willPublish')}</p>
        <dl className="mt-2 space-y-1">
          <div className="flex gap-2">
            <dt className="text-ink-600">{t('sim.consent.name')}:</dt>
            <dd className="font-medium text-ink-900">{result.participantName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-600">{t('sim.consent.score')}:</dt>
            <dd className="font-medium tabular-nums text-ink-900">{Math.round(result.overall)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-600">{t('sim.consent.mode')}:</dt>
            <dd className="font-medium text-ink-900">{tx(modeLabel(result.testMode))}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-ink-600">{t('sim.consent.privacy')}</p>
      </div>

      {status === 'error' && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {t('sim.consent.error')}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={publish}
          disabled={status === 'submitting'}
          className="rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {status === 'submitting' ? t('sim.consent.submitting') : t('sim.consent.publish')}
        </button>
        <button
          type="button"
          onClick={() => setDeclined(true)}
          className="rounded-xl border border-line px-6 py-2.5 text-sm font-semibold text-ink-900"
        >
          {t('sim.consent.decline')}
        </button>
      </div>
    </Card>
  );
}

function modeLabel(mode: TestResult['testMode']) {
  // Labels come from the adaptive spec; keep a tiny local copy to avoid a
  // bank dependency in this component.
  return {
    quick: { en: 'Quick Simulation', es: 'Simulación rápida' },
    standard: { en: 'Standard Simulation', es: 'Simulación estándar' },
    full: { en: 'Full Simulation', es: 'Simulación completa' },
  }[mode];
}
