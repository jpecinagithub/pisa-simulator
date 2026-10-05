import { useEffect, useState } from 'react';
import { useLang } from '../i18n';
import { getCycleResults } from '../lib/oecd';
import { PISA_CYCLES } from '../types/oecd';
import type { Domain } from '../types/oecd';
import { usePageMeta } from '../features/explorer/usePageMeta';
import { explorer as enExplorer } from '../i18n/en/explorer';
import { explorer as esExplorer } from '../i18n/es/explorer';

type Dict = Record<string, unknown>;

function flattenKeys(obj: Dict, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === 'object') out.push(...flattenKeys(v as Dict, path));
    else out.push(path);
  }
  return out;
}

interface BankStats {
  units: number;
  questions: number;
  byDomain: Record<string, number>;
  byLevel: Record<string, number>;
  byDifficulty: Record<string, number>;
}

interface BankModule {
  getAllUnits?: () => {
    id: string;
    domain?: string;
    questions?: { id: string; level?: number; difficulty?: number }[];
  }[];
}

export default function Admin() {
  const { t } = useLang();
  usePageMeta(t('explorer.admin.metaTitle'), t('explorer.admin.metaDescription'));

  const [bank, setBank] = useState<BankStats | null>(null);
  const [bankTried, setBankTried] = useState(false);

  // Question bank is owned by the SIMULATOR agent; load defensively.
  useEffect(() => {
    let alive = true;
    import('../lib/simulator/bank')
      .then((mod: BankModule) => {
        if (!alive) return;
        const units = mod.getAllUnits ? mod.getAllUnits() : [];
        const byDomain: Record<string, number> = {};
        const byLevel: Record<string, number> = {};
        const byDifficulty: Record<string, number> = {};
        let questions = 0;
        for (const u of units) {
          const qs = u.questions ?? [];
          questions += qs.length;
          const d = u.domain ?? 'unknown';
          byDomain[d] = (byDomain[d] ?? 0) + qs.length;
          for (const qq of qs) {
            const lv = qq.level != null ? `L${qq.level}` : 'unknown';
            byLevel[lv] = (byLevel[lv] ?? 0) + 1;
            const band = qq.difficulty == null ? 'unknown' : qq.difficulty < -1 ? 'easy' : qq.difficulty > 1 ? 'hard' : 'medium';
            byDifficulty[band] = (byDifficulty[band] ?? 0) + 1;
          }
        }
        setBank({ units: units.length, questions, byDomain, byLevel, byDifficulty });
        setBankTried(true);
      })
      .catch(() => {
        if (alive) setBankTried(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Translation check: explorer keys present in one language but not the other.
  const enKeys = flattenKeys(enExplorer as unknown as Dict);
  const esKeys = flattenKeys(esExplorer as unknown as Dict);
  const esSet = new Set(esKeys);
  const enSet = new Set(enKeys);
  const missingInEs = enKeys.filter((k) => !esSet.has(k));
  const missingInEn = esKeys.filter((k) => !enSet.has(k));

  // Historical coverage per cycle.
  const coverage = PISA_CYCLES.map((year) => {
    let rows = 0;
    let missMath = 0;
    let missReading = 0;
    let missScience = 0;
    try {
      const res = getCycleResults(year).filter((r) => r.countryCode !== 'oecd-average');
      rows = res.length;
      for (const r of res) {
        if (r.mathematics == null) missMath++;
        if (r.reading == null) missReading++;
        if (r.science == null) missScience++;
      }
    } catch {
      rows = 0; // contract stub or missing module → surfaced in the status pill below
    }
    return { year, rows, missMath, missReading, missScience };
  });
  const dataOk = coverage.some((c) => c.rows > 0);

  const domains: Domain[] = ['math', 'reading', 'science'];
  const domainName: Record<Domain, string> = {
    math: t('explorer.results.domainMath'),
    reading: t('explorer.results.domainReading'),
    science: t('explorer.results.domainScience'),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-navy-950">{t('explorer.admin.title')}</h1>
      <p className="mt-3 text-ink-600">{t('explorer.admin.intro')}</p>

      {/* Data source status */}
      <section aria-labelledby="ds" className="mt-8">
        <h2 id="ds" className="font-display text-xl font-bold text-navy-950">
          {t('explorer.admin.dataSource')}
        </h2>
        <p className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${dataOk ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {dataOk ? t('explorer.admin.dataOk') : t('explorer.admin.dataMissing')}
        </p>
      </section>

      {/* Question bank */}
      <section aria-labelledby="bank" className="mt-8">
        <h2 id="bank" className="font-display text-xl font-bold text-navy-950">
          {t('explorer.admin.bankTitle')}
        </h2>
        {!bankTried ? (
          <p className="mt-2 text-ink-600">{t('common.common.loading')}</p>
        ) : !bank ? (
          <p className="mt-2 rounded-xl border border-dashed border-line p-6 text-center text-ink-600">
            {t('explorer.admin.bankNotLoaded')}
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-line bg-paper p-4">
              <p className="text-sm text-ink-600">{t('explorer.admin.bankUnits')}</p>
              <p className="font-display text-3xl font-bold tabular-nums text-navy-950">{bank.units}</p>
            </div>
            <div className="rounded-xl border border-line bg-paper p-4">
              <p className="text-sm text-ink-600">{t('explorer.admin.bankQuestions')}</p>
              <p className="font-display text-3xl font-bold tabular-nums text-navy-950">{bank.questions}</p>
            </div>
            <div className="rounded-xl border border-line bg-paper p-4">
              <p className="mb-2 text-sm text-ink-600">{t('explorer.admin.bankByDomain')}</p>
              <ul className="space-y-1 text-sm tabular-nums">
                {domains.map((d) => (
                  <li key={d} className="flex justify-between">
                    <span>{domainName[d]}</span>
                    <span className="font-semibold">{bank.byDomain[d] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-paper p-4">
              <p className="mb-2 text-sm text-ink-600">{t('explorer.admin.bankByLevel')}</p>
              <ul className="space-y-1 text-sm tabular-nums">
                {Object.entries(bank.byLevel)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([k, v]) => (
                    <li key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span className="font-semibold">{v}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Historical coverage */}
      <section aria-labelledby="cov" className="mt-8">
        <h2 id="cov" className="font-display text-xl font-bold text-navy-950">
          {t('explorer.admin.coverageTitle')}
        </h2>
        <p className="mt-1 text-sm text-ink-600">{t('explorer.admin.coverageIntro')}</p>
        <div className="data-scroll mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[560px] border-collapse bg-paper text-sm">
            <thead>
              <tr className="border-b border-line bg-mist text-left">
                <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.admin.colCycle')}</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.admin.colSystems')}</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.admin.colMissingMath')}</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.admin.colMissingReading')}</th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink-600">{t('explorer.admin.colMissingScience')}</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((c) => (
                <tr key={c.year} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-semibold tabular-nums text-navy-900">{c.year}</td>
                  <td className="px-4 py-2.5 tabular-nums">{c.rows}</td>
                  <td className="px-4 py-2.5 tabular-nums">{c.missMath}</td>
                  <td className="px-4 py-2.5 tabular-nums">{c.missReading}</td>
                  <td className="px-4 py-2.5 tabular-nums">{c.missScience}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Translation check */}
      <section aria-labelledby="i18n" className="mt-8">
        <h2 id="i18n" className="font-display text-xl font-bold text-navy-950">
          {t('explorer.admin.i18nTitle')}
        </h2>
        <p className="mt-1 text-sm text-ink-600">{t('explorer.admin.i18nIntro')}</p>
        {missingInEs.length === 0 && missingInEn.length === 0 ? (
          <p className="mt-3 inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
            {t('explorer.admin.i18nOk')}
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-line bg-paper p-4">
              <h3 className="font-semibold text-navy-900">
                {t('explorer.admin.missingInEs')} ({missingInEs.length})
              </h3>
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto font-mono text-xs text-red-800">
                {missingInEs.map((k) => (
                  <li key={k}>explorer.{k}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-paper p-4">
              <h3 className="font-semibold text-navy-900">
                {t('explorer.admin.missingInEn')} ({missingInEn.length})
              </h3>
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto font-mono text-xs text-red-800">
                {missingInEn.map((k) => (
                  <li key={k}>explorer.{k}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
