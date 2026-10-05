// /leaderboard — global Top 25 per test mode (full / standard / quick).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TestMode } from '../types/simulator';
import { useLang } from '../i18n';
import { fetchBoard, type BoardEntry } from '../lib/leaderboard';

const MODES: TestMode[] = ['full', 'standard', 'quick'];

function modeLabel(m: TestMode, lang: 'en' | 'es'): string {
  const map = {
    full: { en: 'Full Simulation', es: 'Simulación completa' },
    standard: { en: 'Standard Simulation', es: 'Simulación estándar' },
    quick: { en: 'Quick Simulation', es: 'Simulación rápida' },
  } as const;
  return map[m][lang];
}

export default function Leaderboard() {
  const { t, lang } = useLang();
  const [mode, setMode] = useState<TestMode>('full');
  const [entries, setEntries] = useState<BoardEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error' | 'offline'>('loading');

  const load = useCallback(async (m: TestMode) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline');
      return;
    }
    setStatus('loading');
    try {
      const data = await fetchBoard(m);
      setEntries(data);
      setStatus('ok');
    } catch {
      setStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
    }
  }, []);

  useEffect(() => {
    load(mode);
  }, [mode, load]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold text-navy-900 sm:text-4xl">{t('sim.board.title')}</h1>
      <p className="mt-2 text-ink-600">{t('sim.board.subtitle')}</p>

      <div className="mt-6 inline-flex rounded-xl border border-line p-1" role="tablist" aria-label={t('sim.board.mode')}>
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              mode === m ? 'bg-navy-900 text-white' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            {modeLabel(m, lang)}
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {status === 'loading' && (
          <p className="py-12 text-center text-ink-600" aria-busy="true">
            {t('common.loading')}
          </p>
        )}
        {status === 'offline' && (
          <div role="alert" className="rounded-2xl border border-line bg-mist p-8 text-center">
            <p className="text-ink-900">{t('sim.board.offline')}</p>
            <button
              type="button"
              onClick={() => load(mode)}
              className="mt-4 rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white"
            >
              {t('sim.board.retry')}
            </button>
          </div>
        )}
        {status === 'error' && (
          <div role="alert" className="rounded-2xl border border-line bg-mist p-8 text-center">
            <p className="text-ink-900">{t('sim.board.error')}</p>
            <button
              type="button"
              onClick={() => load(mode)}
              className="mt-4 rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white"
            >
              {t('sim.board.retry')}
            </button>
          </div>
        )}
        {status === 'ok' && entries.length === 0 && (
          <div className="rounded-2xl border border-line bg-mist p-8 text-center">
            <p className="text-ink-900">{t('sim.board.empty')}</p>
            <Link
              to="/pisa-simulator"
              className="mt-4 inline-block rounded-xl bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white"
            >
              {t('sim.board.takeSimulator')}
            </Link>
          </div>
        )}
        {status === 'ok' && entries.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="bg-mist text-left">
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-900">{t('sim.board.rank')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink-900">{t('sim.board.name')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-ink-900">{t('sim.board.score')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold text-ink-900">{t('sim.board.date')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={`${e.name}-${e.created_at}-${i}`} className={i % 2 ? 'bg-mist/40' : 'bg-paper'}>
                    <td className="px-4 py-2.5 font-bold tabular-nums text-navy-900">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-ink-900">{e.name}</td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-navy-900">{e.score}</td>
                    <td className="px-4 py-2.5 text-right text-ink-600">
                      {new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(e.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-2 text-sm leading-relaxed text-ink-600">
        <p>{t('sim.board.fairness')}</p>
        <p className="font-medium text-ink-900">{t('sim.board.notOfficial')}</p>
      </div>
    </div>
  );
}
