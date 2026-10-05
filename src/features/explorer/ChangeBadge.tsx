import { useLang } from '../../i18n';

interface ChangeBadgeProps {
  current?: number;
  previous?: number;
  /** year of the previous value, for the aria-label */
  previousYear?: number;
}

/** ↑/↓/→ change indicator with absolute + percentage change.
 *  Never conveys meaning through colour alone: symbol + text + colour. */
export function ChangeBadge({ current, previous, previousYear }: ChangeBadgeProps) {
  const { t } = useLang();

  if (current == null || previous == null || previous === 0) {
    return <span className="text-sm text-ink-400">{t('common.common.noData')}</span>;
  }

  const diff = current - previous;
  const pct = (diff / previous) * 100;
  const abs = Math.abs(diff);
  const pctStr = `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`;
  const ptsStr = `${diff >= 0 ? '+' : '−'}${abs.toFixed(0)}`;

  // Differences under ~5 points are treated as broadly stable at a glance
  // (official statistical significance is not available in this dataset).
  const stable = abs < 5;
  const symbol = stable ? '→' : diff > 0 ? '↑' : '↓';
  const cls = stable
    ? 'bg-mist text-ink-600'
    : diff > 0
      ? 'bg-emerald-50 text-emerald-800'
      : 'bg-red-50 text-red-800';

  const aria = stable
    ? t('explorer.components.change.stable').replace('{points}', abs.toFixed(0))
    : diff > 0
      ? t('explorer.components.change.increasedBy').replace('{points}', abs.toFixed(0)).replace('{pct}', `${Math.abs(pct).toFixed(1)}%`)
      : t('explorer.components.change.decreasedBy').replace('{points}', abs.toFixed(0)).replace('{pct}', `${Math.abs(pct).toFixed(1)}%`);

  return (
    <span
      role="img"
      aria-label={`${aria}${previousYear ? ` ${t('explorer.components.change.since').replace('{year}', String(previousYear))}` : ''}`}
      title={aria}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${cls}`}
    >
      <span aria-hidden="true">{symbol}</span>
      <span aria-hidden="true" className="tabular-nums">
        {ptsStr} · {pctStr}
      </span>
    </span>
  );
}
