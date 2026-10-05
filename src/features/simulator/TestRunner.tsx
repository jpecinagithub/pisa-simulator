// Focused full-screen PISA-style assessment runner.
// Adaptive multistage flow: stage 1 comes from buildAdaptivePlan(); when a
// stage ends, buildNextStage() appends the next block (or returns no
// questions → the assessment is finished). Previous navigation is allowed
// within the current stage only. Answers autosave to the session store.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  PisaQuestion,
  TestResponse,
  TestSession,
} from '../../types/simulator';
import type { Domain } from '../../types/oecd';
import { useLang } from '../../i18n';
import { trackEvent } from '../../lib/analytics';
import { getAllUnits, getQuestionById, getUnitOfQuestion } from '../../lib/simulator/bank';
import { gradeResponse } from '../../lib/simulator/grading';
import { STAGE_CONFIG, buildNextStage } from '../../lib/simulator/adaptive';
import { buildResult } from '../../lib/simulator/report';
import { clearSession, loadSession, saveSession } from '../../lib/simulator/session';
import { appendReportHistory } from '../../lib/simulator/history';
import { domainName } from './shared';

type Answer = number | number[] | string | null;

const STAGE_KEY = (id: string) => `pisa-simulator:stage:${id}`;
const RESULT_KEY = 'pisa-simulator:last-result';
const SESSION_BACKUP_KEY = 'pisa-simulator:last-session';

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function emptyResponse(qid: string): TestResponse {
  return { questionId: qid, answer: null, flagged: false, timeSpentSeconds: 0, points: null };
}

/** Deterministic per-stage seed so a resumed session routes identically. */
function seedForStage(sessionId: string, stage: number): number {
  let h = 2166136261;
  const s = `${sessionId}:${stage}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function TestRunner() {
  const { t, tx } = useLang();
  const navigate = useNavigate();
  const [session, setSession] = useState<TestSession | null>(null);
  const [stageStart, setStageStart] = useState(0);
  const [fontStep, setFontStep] = useState(0); // 0,1,2
  const [highContrast, setHighContrast] = useState(false);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const finishingRef = useRef(false);
  const qStartRef = useRef<number>(Date.now());

  // ── mount: restore session or bounce to setup ──────────────────────────
  useEffect(() => {
    const s = loadSession();
    if (!s || s.finishedAt) {
      navigate('/pisa-simulator', { replace: true });
      return;
    }
    setSession(s);
    try {
      const raw = localStorage.getItem(STAGE_KEY(s.sessionId));
      if (raw) {
        const parsed = JSON.parse(raw) as { stageStart?: number };
        if (typeof parsed.stageStart === 'number') setStageStart(parsed.stageStart);
        setRecovered(true);
      }
    } catch {
      /* ignore */
    }
    qStartRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((s: TestSession, nextStageStart?: number) => {
    setSession({ ...s });
    saveSession(s);
    if (nextStageStart !== undefined) {
      setStageStart(nextStageStart);
      try {
        localStorage.setItem(STAGE_KEY(s.sessionId), JSON.stringify({ stageStart: nextStageStart }));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const commitTime = useCallback(
    (s: TestSession) => {
      const qid = s.plan[s.currentIndex];
      if (!qid) return;
      const elapsed = Math.max(0, (Date.now() - qStartRef.current) / 1000);
      const r = s.responses[qid] ?? emptyResponse(qid);
      r.timeSpentSeconds += elapsed;
      s.responses[qid] = r;
      qStartRef.current = Date.now();
    },
    [],
  );

  // ── finish ────────────────────────────────────────────────────────────
  const finish = useCallback(
    (timedOut: boolean) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      const s = loadSession();
      if (!s) {
        navigate('/pisa-simulator', { replace: true });
        return;
      }
      commitTime(s);
      // Grade every answered question (points stay null when unanswered).
      for (const qid of s.plan) {
        const q = getQuestionById(qid);
        const r = s.responses[qid];
        if (!q) continue;
        if (r && r.answer !== null) {
          r.points = gradeResponse(q, r.answer);
        } else if (r) {
          r.points = null;
        }
      }
      s.finishedAt = Date.now();
      let result;
      try {
        result = buildResult(s);
      } catch {
        navigate('/pisa-simulator', { replace: true });
        return;
      }
      try {
        localStorage.setItem(RESULT_KEY, JSON.stringify(result));
        localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(s));
        localStorage.removeItem(STAGE_KEY(s.sessionId));
        appendReportHistory(result);
      } catch {
        /* storage full — results page will show the empty state */
      }
      clearSession();
      trackEvent('simulation_completed');
      navigate('/pisa-simulator/results', { replace: true, state: { timedOut } });
    },
    [commitTime, navigate],
  );
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // ── countdown ─────────────────────────────────────────────────────────
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = session ? Math.max(0, session.endsAt - now) : 0;
  useEffect(() => {
    if (session && remaining <= 0) finishRef.current(true);
  }, [session, remaining]);

  // periodic time-commit autosave (answers themselves save immediately)
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => {
      const s = loadSession();
      if (!s || finishingRef.current) return;
      commitTime(s);
      saveSession(s);
    }, 15000);
    return () => clearInterval(id);
  }, [session, commitTime]);

  const currentQid = session?.plan[session.currentIndex];
  const question: PisaQuestion | null = currentQid ? (getQuestionById(currentQid) ?? null) : null;
  const unit = currentQid ? getUnitOfQuestion(currentQid) : undefined;

  const response: TestResponse | undefined = currentQid ? session?.responses[currentQid] : undefined;

  function updateResponse(qid: string, patch: Partial<TestResponse>) {
    if (!session) return;
    const next: TestSession = {
      ...session,
      responses: { ...session.responses, [qid]: { ...emptyResponse(qid), ...session.responses[qid], ...patch } },
    };
    commitTime(next);
    persist(next);
  }

  function setAnswer(a: Answer) {
    if (!currentQid) return;
    updateResponse(currentQid, { answer: a });
  }

  function toggleFlag() {
    if (!currentQid) return;
    updateResponse(currentQid, { flagged: !response?.flagged });
  }

  function goTo(i: number) {
    if (!session) return;
    const next = { ...session, currentIndex: i };
    commitTime(next);
    qStartRef.current = Date.now();
    persist(next);
    setConfirmingFinish(false);
  }

  function completeStage() {
    if (!session) return;
    const totalStages = STAGE_CONFIG[session.testMode].stages;
    // Final stage completed → finish the assessment.
    if (session.stage >= totalStages) {
      finishRef.current(false);
      return;
    }
    // Route on this stage's performance (full-points correct count).
    const stageIds = session.plan.slice(stageStart);
    let correct = 0;
    let total = 0;
    for (const qid of stageIds) {
      const q = getQuestionById(qid);
      if (!q) continue;
      const r = session.responses[qid];
      total += 1;
      if (r && r.answer !== null && gradeResponse(q, r.answer) >= q.maxPoints) correct += 1;
    }
    // Cumulative domain counts keep every domain represented across stages.
    const domainCounts: Record<Domain, number> = { math: 0, reading: 0, science: 0 };
    for (const qid of session.plan) {
      const q = getQuestionById(qid);
      if (q) domainCounts[q.domain] += 1;
    }
    const nextStage = session.stage + 1;
    const next = buildNextStage(nextStage, correct, total, new Set(session.plan), {
      mode: session.testMode,
      domainCounts,
      units: getAllUnits(),
      seed: seedForStage(session.sessionId, nextStage),
    });
    if (next.questionIds.length === 0) {
      finishRef.current(false);
      return;
    }
    const nextSession: TestSession = {
      ...session,
      plan: [...session.plan, ...next.questionIds],
      unitOf: { ...session.unitOf, ...next.unitOf },
      stage: nextStage,
      currentIndex: session.plan.length,
    };
    commitTime(nextSession);
    qStartRef.current = Date.now();
    persist(nextSession, session.plan.length);
  }

  function onNext() {
    if (!session) return;
    if (session.currentIndex < session.plan.length - 1) {
      goTo(session.currentIndex + 1);
    } else {
      completeStage();
    }
  }

  const canGoPrev = !!session && session.currentIndex > stageStart;

  const fontClass = ['text-base', 'text-lg', 'text-xl'][Math.min(2, Math.max(0, fontStep))];

  const progressPct = useMemo(() => {
    if (!session || session.plan.length === 0) return 0;
    return Math.round(((session.currentIndex + 1) / session.plan.length) * 100);
  }, [session]);

  if (!session || !question) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-ink-600" aria-busy="true">
        {t('common.loading')}
      </div>
    );
  }

  const domainLabel = domainName(question.domain, t);

  return (
    <div className={`fixed inset-0 z-[70] overflow-y-auto bg-paper ${highContrast ? 'sim-hc' : ''}`}>
      {highContrast && (
        <style>{`.sim-hc{--tw-bg-opacity:1}.sim-hc .hc-surface{background:#fff!important;color:#000!important;border-color:#000!important}.sim-hc .hc-muted{color:#1a1a1a!important}.sim-hc .hc-input{background:#fff!important;color:#000!important;border:2px solid #000!important}`}</style>
      )}
      {/* header */}
      <header className="hc-surface sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <span className="text-sm font-bold tracking-wide text-navy-900">{t('sim.test.brand')}</span>
          <span aria-hidden="true" className="text-line">|</span>
          <span className="text-sm font-medium text-ink-600 hc-muted">{domainLabel}</span>
          <span className="ml-auto flex items-center gap-4">
            <span className="text-sm tabular-nums text-ink-900" role="timer" aria-label={t('sim.test.timeRemaining')}>
              <span aria-hidden="true">{fmtClock(remaining)}</span>
              <span className="sr-only">{t('sim.test.timeRemaining')}: {fmtClock(remaining)}</span>
            </span>
            <button
              type="button"
              onClick={() => (confirmingFinish ? finishRef.current(false) : setConfirmingFinish(true))}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-600 hover:border-ink-400 hc-muted"
            >
              {confirmingFinish ? t('sim.test.confirmFinish') : t('sim.test.finish')}
            </button>
            {confirmingFinish && (
              <button
                type="button"
                onClick={() => setConfirmingFinish(false)}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-600"
              >
                {t('sim.test.cancel')}
              </button>
            )}
          </span>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-ink-600 hc-muted">
            <span>{t('sim.test.questionOf').replace('{i}', String(session.currentIndex + 1)).replace('{n}', String(session.plan.length))}</span>
            <span>{progressPct}%</span>
          </div>
          <div
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-mist"
            role="progressbar"
            aria-label={t('sim.test.progress')}
            aria-valuemin={0}
            aria-valuemax={session.plan.length}
            aria-valuenow={session.currentIndex + 1}
          >
            <div className="h-full rounded-full bg-navy-900 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </header>

      <main className={`mx-auto max-w-6xl px-4 py-6 ${fontClass}`}>
        {recovered && (
          <p role="status" className="mb-4 rounded-xl border border-line bg-mist px-4 py-2 text-sm text-ink-600">
            {t('sim.test.sessionRecovered')}
          </p>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* stimulus panel */}
          <section aria-label={t('sim.test.stimulus')} className="hc-surface h-fit rounded-2xl border border-line bg-mist/60 p-5">
            {unit && (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{t('sim.test.stimulus')}</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-navy-900">{tx(unit.title)}</h2>
                {unit.intro && <p className="mt-2 leading-relaxed text-ink-900">{tx(unit.intro)}</p>}
                <div className="mt-4 space-y-4">
                  {unit.stimuli.map((s, i) => (
                    <StimulusView key={i} index={i} kind={s.kind} stimulus={s} tx={tx} />
                  ))}
                </div>
              </>
            )}
          </section>

          {/* question panel */}
          <section aria-labelledby="sim-q-prompt" className="hc-surface rounded-2xl border border-line bg-paper p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 id="sim-q-prompt" className="text-lg font-semibold leading-relaxed text-ink-900">
                {tx(question.prompt)}
              </h2>
              <button
                type="button"
                onClick={toggleFlag}
                aria-pressed={!!response?.flagged}
                title={response?.flagged ? t('sim.test.unflag') : t('sim.test.flag')}
                className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-sm font-medium ${
                  response?.flagged
                    ? 'border-amber-500 bg-amber-50 text-amber-900'
                    : 'border-line text-ink-600 hover:border-ink-400'
                }`}
              >
                {response?.flagged ? t('sim.test.flagged') : t('sim.test.flag')}
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-600 hc-muted">
              {question.type === 'single-choice' && t('sim.test.selectOne')}
              {question.type === 'multiple-choice' && t('sim.test.selectAll')}
              {question.type === 'numeric' && t('sim.test.enterNumber')}
              {question.type === 'short-response' && t('sim.test.enterText')}
            </p>

            <div className="mt-4">
              <AnswerWidget question={question} answer={response?.answer ?? null} onChange={setAnswer} tx={tx} t={t} />
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => canGoPrev && goTo(session.currentIndex - 1)}
                disabled={!canGoPrev}
                title={!canGoPrev ? t('sim.test.noBackToPreviousStage') : undefined}
                className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('sim.test.previous')}
              </button>
              <button
                type="button"
                onClick={onNext}
                className="rounded-xl bg-navy-900 px-8 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
              >
                {t('sim.test.next')}
              </button>
            </div>
          </section>
        </div>

        {/* footer: accessibility + autosave */}
        <footer className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-sm text-ink-600 hc-muted">
          <span className="font-medium">{t('sim.test.accessibility')}:</span>
          <span className="inline-flex items-center gap-2">
            <button type="button" onClick={() => setFontStep((s) => Math.max(0, s - 1))} aria-label={t('sim.test.decreaseFont')} className="rounded-lg border border-line px-2.5 py-1 font-bold">A−</button>
            <button type="button" onClick={() => setFontStep((s) => Math.min(2, s + 1))} aria-label={t('sim.test.increaseFont')} className="rounded-lg border border-line px-2.5 py-1 font-bold">A+</button>
          </span>
          <button
            type="button"
            onClick={() => setHighContrast((v) => !v)}
            aria-pressed={highContrast}
            className="rounded-lg border border-line px-3 py-1"
          >
            {highContrast ? t('sim.test.standardContrast') : t('sim.test.highContrast')}
          </button>
          <span className="ml-auto">{t('sim.test.autosave')}</span>
        </footer>
      </main>
    </div>
  );
}

function StimulusView({
  kind,
  stimulus,
  tx,
}: {
  index: number;
  kind: string;
  stimulus: { text?: { en: string; es: string }; headers?: { en: string; es: string }[]; rows?: string[][]; items?: { en: string; es: string }[]; caption?: { en: string; es: string } };
  tx: (v: { en: string; es: string }) => string;
}) {
  if (kind === 'table' && stimulus.headers && stimulus.rows) {
    return (
      <figure className="overflow-x-auto rounded-xl border border-line bg-paper">
        <table className="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr className="bg-mist">
              {stimulus.headers.map((h, i) => (
                <th key={i} scope="col" className="border-b border-line px-3 py-2 text-left font-semibold text-ink-900">
                  {tx(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stimulus.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 ? 'bg-mist/50' : ''}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border-b border-line px-3 py-2 tabular-nums text-ink-900">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {stimulus.caption && <figcaption className="px-3 py-2 text-xs text-ink-600">{tx(stimulus.caption)}</figcaption>}
      </figure>
    );
  }
  if (kind === 'list' && stimulus.items) {
    return (
      <ul className="list-disc space-y-1.5 pl-5 leading-relaxed text-ink-900">
        {stimulus.items.map((it, i) => (
          <li key={i}>{tx(it)}</li>
        ))}
      </ul>
    );
  }
  if (kind === 'callout' && stimulus.text) {
    return (
      <aside className="rounded-xl border-l-4 border-accent bg-paper px-4 py-3 leading-relaxed text-ink-900">
        {tx(stimulus.text)}
        {stimulus.caption && <p className="mt-1 text-xs text-ink-600">{tx(stimulus.caption)}</p>}
      </aside>
    );
  }
  if (stimulus.text) {
    return (
      <div className="space-y-3 leading-relaxed text-ink-900">
        {tx(stimulus.text)
          .split(/\n\n+/)
          .map((p, i) => (
            <p key={i}>{p}</p>
          ))}
      </div>
    );
  }
  return null;
}

function AnswerWidget({
  question,
  answer,
  onChange,
  tx,
  t,
}: {
  question: PisaQuestion;
  answer: Answer;
  onChange: (a: Answer) => void;
  tx: (v: { en: string; es: string }) => string;
  t: (k: string) => string;
}) {
  if (question.type === 'single-choice' && question.options) {
    const name = `q-${question.id}`;
    return (
      <fieldset>
        <legend className="sr-only">{tx(question.prompt)}</legend>
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label
              key={i}
              className={`hc-input flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 leading-relaxed ${
                answer === i ? 'border-navy-900 bg-mist' : 'border-line bg-paper hover:border-ink-400'
              }`}
            >
              <input
                type="radio"
                name={name}
                checked={answer === i}
                onChange={() => onChange(i)}
                className="mt-1 h-4 w-4 shrink-0 accent-[#0e2a52]"
              />
              <span className="text-ink-900">
                <span className="mr-2 font-semibold text-ink-400" aria-hidden="true">
                  {String.fromCharCode(65 + i)}
                </span>
                {tx(opt)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (question.type === 'multiple-choice' && question.options) {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <fieldset>
        <legend className="sr-only">{tx(question.prompt)}</legend>
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <label
              key={i}
              className={`hc-input flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 leading-relaxed ${
                selected.includes(i) ? 'border-navy-900 bg-mist' : 'border-line bg-paper hover:border-ink-400'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(i)}
                onChange={() =>
                  onChange(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i].sort((a, b) => a - b))
                }
                className="mt-1 h-4 w-4 shrink-0 accent-[#0e2a52]"
              />
              <span className="text-ink-900">
                <span className="mr-2 font-semibold text-ink-400" aria-hidden="true">
                  {String.fromCharCode(65 + i)}
                </span>
                {tx(opt)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (question.type === 'numeric') {
    return (
      <input
        type="number"
        inputMode="decimal"
        value={typeof answer === 'number' ? answer : ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
        aria-label={t('sim.test.enterNumber')}
        className="hc-input w-full max-w-xs rounded-xl border border-line bg-paper px-4 py-3 text-lg tabular-nums text-ink-900"
      />
    );
  }
  return (
    <input
      type="text"
      value={typeof answer === 'string' ? answer : ''}
      onChange={(e) => onChange(e.target.value.trim() === '' ? null : e.target.value)}
      aria-label={t('sim.test.enterText')}
      className="hc-input w-full rounded-xl border border-line bg-paper px-4 py-3 text-base text-ink-900"
    />
  );
}
