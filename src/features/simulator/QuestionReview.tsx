// Post-test answer review. Difficulty levels and correct answers are shown
// ONLY here — never during the assessment.
import { useMemo } from 'react';
import type { PisaQuestion, TestSession } from '../../types/simulator';
import { useLang } from '../../i18n';
import { getQuestionById, getUnitOfQuestion } from '../../lib/simulator/bank';
import { Card, domainName } from './shared';

type Answer = number | number[] | string | null;

function formatAnswer(q: PisaQuestion, answer: Answer, tx: (v: { en: string; es: string }) => string, t: (k: string) => string): string {
  if (answer === null || answer === undefined) return t('sim.review.unanswered');
  if (q.type === 'single-choice' && typeof answer === 'number') {
    const opt = q.options?.[answer];
    return opt ? `${String.fromCharCode(65 + answer)}. ${tx(opt)}` : `#${answer + 1}`;
  }
  if (q.type === 'multiple-choice' && Array.isArray(answer)) {
    if (answer.length === 0) return t('sim.review.unanswered');
    return answer
      .map((i) => {
        const opt = q.options?.[i];
        return opt ? `${String.fromCharCode(65 + i)}. ${tx(opt)}` : `#${i + 1}`;
      })
      .join(' · ');
  }
  return String(answer);
}

export function QuestionReview({ session }: { session: TestSession }) {
  const { t, tx } = useLang();

  const items = useMemo(
    () =>
      session.plan
        .map((qid, i) => {
          const q = getQuestionById(qid);
          if (!q) return null;
          const unit = getUnitOfQuestion(qid);
          const r = session.responses[qid];
          return { q, unit, r, index: i };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    [session],
  );

  return (
    <section aria-labelledby="sim-review-title" className="mt-10">
      <h2 id="sim-review-title" className="font-display text-2xl font-semibold text-navy-900">
        {t('sim.review.title')}
      </h2>
      <p className="mt-1 text-sm text-ink-600">{t('sim.review.subtitle')}</p>
      <ol className="mt-5 space-y-5">
        {items.map(({ q, unit, r, index }) => {
          const userPoints = r?.points ?? null;
          const correct = userPoints !== null && userPoints >= q.maxPoints;
          return (
            <li key={q.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-navy-900">
                    {t('sim.review.question').replace('{n}', String(index + 1))}
                  </span>
                  <span className="rounded-full bg-mist px-2.5 py-0.5 font-medium text-ink-600">
                    {domainName(q.domain, t)}
                  </span>
                  <span className="rounded-full bg-mist px-2.5 py-0.5 font-medium text-ink-600">
                    {t('sim.review.level')}: {q.level}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-medium ${
                      correct ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                    }`}
                  >
                    {userPoints === null ? t('sim.review.unanswered') : `${userPoints}/${q.maxPoints}`}
                  </span>
                </div>
                {unit && (
                  <p className="mt-2 text-xs text-ink-400">
                    {t('sim.review.fromUnit').replace('{title}', tx(unit.title))}
                  </p>
                )}
                <p className="mt-2 font-medium leading-relaxed text-ink-900">{tx(q.prompt)}</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="rounded-xl bg-mist/70 px-4 py-3">
                    <dt className="font-semibold text-ink-900">{t('sim.review.yourAnswer')}</dt>
                    <dd className="mt-1 leading-relaxed text-ink-600">{formatAnswer(q, r?.answer ?? null, tx, t)}</dd>
                  </div>
                  <div className="rounded-xl bg-emerald-50/60 px-4 py-3">
                    <dt className="font-semibold text-ink-900">{t('sim.review.correctAnswer')}</dt>
                    <dd className="mt-1 leading-relaxed text-ink-600">{formatAnswer(q, q.correctAnswer as Answer, tx, t)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-900">{t('sim.review.explanation')}</dt>
                    <dd className="mt-1 leading-relaxed text-ink-600">{tx(q.explanation)}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-600">
                    <span>
                      <strong className="font-semibold text-ink-900">{t('sim.review.competency')}: </strong>
                      {t(`sim.competencies.${q.competency}`)}
                    </span>
                  </div>
                </dl>
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
