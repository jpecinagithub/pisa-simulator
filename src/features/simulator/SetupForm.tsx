// PISA Simulator setup: name, test-mode selection, independence consent.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestMode, TestSession } from '../../types/simulator';
import { useLang } from '../../i18n';
import { trackEvent } from '../../lib/analytics';
import { TEST_MODE_SPECS, buildAdaptivePlan } from '../../lib/simulator/adaptive';
import { getAllUnits } from '../../lib/simulator/bank';
import { saveSession } from '../../lib/simulator/session';
import { Card, DisclaimerBanner } from './shared';

const MODES: TestMode[] = ['quick', 'standard', 'full'];

export function SetupForm() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<TestMode>('standard');
  const [consent, setConsent] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [consentError, setConsentError] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const badName = trimmed.length === 0;
    setNameError(badName);
    setConsentError(!consent);
    if (badName || !consent) return;

    const { plan, unitOf } = buildAdaptivePlan(mode, getAllUnits(), Math.floor(Math.random() * 2 ** 31));
    const spec = TEST_MODE_SPECS[mode];
    const now = Date.now();
    const session: TestSession = {
      sessionId: crypto.randomUUID(),
      participantName: trimmed.slice(0, 40),
      language: lang,
      testMode: mode,
      plan,
      unitOf,
      responses: {},
      currentIndex: 0,
      startedAt: now,
      endsAt: now + spec.minutes * 60_000,
      finishedAt: null,
      stage: 1,
    };
    saveSession(session);
    try {
      localStorage.removeItem(`pisa-simulator:stage:${session.sessionId}`);
    } catch {
      /* ignore */
    }
    trackEvent('simulation_started');
    trackEvent(`test_mode_${mode}`);
    navigate('/pisa-simulator/test');
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="sim-setup-title">
      <div className="space-y-8">
        <div>
          <h1 id="sim-setup-title" className="font-display text-3xl font-semibold text-navy-900 sm:text-4xl">
            {t('sim.setup.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-600">{t('sim.setup.subtitle')}</p>
        </div>

        <DisclaimerBanner text={t('sim.setup.disclaimer')} />

        <Card>
          <label htmlFor="sim-name" className="block text-sm font-semibold text-ink-900">
            {t('sim.setup.nameLabel')} <span aria-hidden="true" className="text-red-700">*</span>
          </label>
          <input
            id="sim-name"
            type="text"
            value={name}
            maxLength={40}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(false);
            }}
            placeholder={t('sim.setup.namePlaceholder')}
            aria-required="true"
            aria-invalid={nameError}
            aria-describedby="sim-name-help sim-name-error"
            className="mt-2 w-full max-w-md rounded-xl border border-line bg-paper px-4 py-3 text-base text-ink-900 placeholder:text-ink-400"
          />
          <p id="sim-name-help" className="mt-2 text-sm text-ink-600">
            {t('sim.setup.nameHelp')}
          </p>
          {nameError && (
            <p id="sim-name-error" role="alert" className="mt-2 text-sm font-medium text-red-700">
              {t('sim.setup.nameRequired')}
            </p>
          )}
        </Card>

        <fieldset>
          <legend className="text-lg font-semibold text-navy-900">{t('sim.setup.modeTitle')}</legend>
          <p className="mt-1 text-sm text-ink-600">{t('sim.setup.modeHint')}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label={t('sim.setup.modeTitle')}>
            {MODES.map((m) => {
              const spec = TEST_MODE_SPECS[m];
              const selected = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMode(m)}
                  className={`rounded-2xl border-2 p-5 text-left transition-colors ${
                    selected
                      ? 'border-navy-900 bg-mist shadow-sm'
                      : 'border-line bg-paper hover:border-ink-400'
                  }`}
                >
                  <span className="block text-base font-semibold text-navy-900">{t(`sim.setup.modes.${m}.name`)}</span>
                  <span className="mt-1 block text-sm font-medium text-accent">
                    {t('sim.setup.questionsCount').replace('{n}', String(spec.questions))} ·{' '}
                    {t('sim.setup.estimatedDuration').replace('{minutes}', String(spec.minutes))}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-ink-600">{t(`sim.setup.modes.${m}.description`)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Card>
          <h2 className="text-base font-semibold text-navy-900">{t('sim.setup.disclaimerTitle')}</h2>
          <div className="mt-3 flex items-start gap-3">
            <input
              id="sim-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (consentError) setConsentError(false);
              }}
              aria-invalid={consentError}
              aria-describedby={consentError ? 'sim-consent-error' : undefined}
              className="mt-1 h-5 w-5 shrink-0 accent-[#0e2a52]"
            />
            <label htmlFor="sim-consent" className="text-sm leading-relaxed text-ink-900">
              {t('sim.setup.consent')}
            </label>
          </div>
          {consentError && (
            <p id="sim-consent-error" role="alert" className="mt-2 text-sm font-medium text-red-700">
              {t('sim.setup.consentRequired')}
            </p>
          )}
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            className="rounded-xl bg-navy-900 px-8 py-3.5 text-base font-semibold text-white hover:bg-navy-800"
          >
            {t('sim.setup.start')}
          </button>
          <p className="text-sm text-ink-600">{t('sim.setup.privacyNote')}</p>
        </div>
      </div>
    </form>
  );
}
