import { Link } from 'react-router-dom';
import { useLang } from '../i18n';
import { usePageMeta } from '../features/explorer/usePageMeta';

/** Pure-SVG circular literacy diagram: steps arranged on a ring with arrows. */
function CycleDiagram({ steps, color }: { steps: string[]; color: string }) {
  const n = steps.length;
  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const R = 88;
  const nodeR = 34;

  const pos = (i: number) => {
    const a = ((i / n) * 2 * Math.PI - Math.PI / 2);
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={steps.join(' → ')}
      className="mx-auto h-auto w-full max-w-[280px]"
    >
      <defs>
        <marker id={`arr-${color.replace('#', '')}`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8" fill="none" stroke={color} strokeWidth="1.6" />
        </marker>
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e4e9f2" strokeWidth="2" strokeDasharray="4 6" />
      {steps.map((_, i) => {
        const a = pos(i);
        const b = pos((i + 1) % n);
        // shorten the line so arrowhead lands on the next node edge
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        const trim = nodeR + 4;
        const x2 = b.x - (dx / len) * trim;
        const y2 = b.y - (dy / len) * trim;
        const x1 = a.x + (dx / len) * 6;
        const y1 = a.y + (dy / len) * 6;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="2"
            markerEnd={`url(#arr-${color.replace('#', '')})`}
          />
        );
      })}
      {steps.map((s, i) => {
        const p = pos(i);
        const words = s.split(' ');
        const lines: string[] = [];
        let cur = '';
        for (const w of words) {
          if ((cur + ' ' + w).trim().length > 16) {
            lines.push(cur.trim());
            cur = w;
          } else cur += ' ' + w;
        }
        lines.push(cur.trim());
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={nodeR} fill="#ffffff" stroke={color} strokeWidth="2.5" />
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill="#101828" fontWeight="600">
              {lines.map((ln, li) => (
                <tspan key={li} x={p.x} dy={li === 0 ? -(lines.length - 1) * 5.5 : 11}>
                  {ln}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function WhatIsPisa() {
  const { t } = useLang();
  usePageMeta(t('explorer.whatispisa.metaTitle'), t('explorer.whatispisa.metaDescription'));

  const domains = [
    {
      title: t('explorer.whatispisa.mathTitle'),
      def: t('explorer.whatispisa.mathDef'),
      color: '#2563eb',
      points: [0, 1, 2, 3].map((i) => t(`explorer.whatispisa.mathPoint${i}`)),
    },
    {
      title: t('explorer.whatispisa.readingTitle'),
      def: t('explorer.whatispisa.readingDef'),
      color: '#b45309',
      points: [0, 1, 2, 3].map((i) => t(`explorer.whatispisa.readingPoint${i}`)),
    },
    {
      title: t('explorer.whatispisa.scienceTitle'),
      def: t('explorer.whatispisa.scienceDef'),
      color: '#059669',
      points: [0, 1, 2, 3].map((i) => t(`explorer.whatispisa.sciencePoint${i}`)),
    },
  ];

  const innovations = [0, 1, 2, 3].map((i) => t(`explorer.whatispisa.innov${i}`));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">PISA</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-navy-950">{t('explorer.whatispisa.title')}</h1>
      <div className="prose-like mt-6 max-w-3xl space-y-4 text-ink-600">
        <p>{t('explorer.whatispisa.intro1')}</p>
        <p>{t('explorer.whatispisa.intro2')}</p>
      </div>

      {/* Acronym card */}
      <section aria-labelledby="meaning" className="mt-10 rounded-2xl border border-line bg-mist p-6 md:p-8">
        <h2 id="meaning" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.whatispisa.meaningTitle')}
        </h2>
        <p className="mt-4 font-display text-5xl font-bold tracking-tight text-navy-900">
          {t('explorer.whatispisa.acronym')}
        </p>
        <p className="mt-2 text-lg font-medium text-navy-800">{t('explorer.whatispisa.acronymFull')}</p>
        <p className="mt-3 max-w-3xl text-ink-600">{t('explorer.whatispisa.acronymNote')}</p>
      </section>

      {/* Core domains with diagrams */}
      <section aria-labelledby="core" className="mt-12">
        <h2 id="core" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.whatispisa.coreTitle')}
        </h2>
        <div className="mt-6 space-y-6">
          {domains.map((d, idx) => (
            <article
              key={d.title}
              className={`grid gap-6 rounded-2xl border border-line bg-paper p-6 shadow-sm md:grid-cols-[1fr_280px] md:p-8 ${
                idx % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''
              }`}
            >
              <div>
                <h3 className="font-display text-xl font-semibold text-navy-950">{d.title}</h3>
                <p className="mt-2 text-ink-600">{d.def}</p>
                <ul className="mt-4 space-y-2">
                  {d.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-ink-600">
                      <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <CycleDiagram steps={d.points.slice(0, 4)} color={d.color} />
                <p className="mt-2 text-center text-xs text-ink-400">{t('explorer.whatispisa.diagramCaption')}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Innovative domains */}
      <section aria-labelledby="innov" className="mt-12">
        <h2 id="innov" className="font-display text-2xl font-bold text-navy-950">
          {t('explorer.whatispisa.innovativeTitle')}
        </h2>
        <p className="mt-3 max-w-3xl text-ink-600">{t('explorer.whatispisa.innovativeIntro')}</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {innovations.map((x) => (
            <li key={x} className="rounded-xl border border-line bg-paper px-4 py-3 text-sm font-medium text-navy-900">
              {x}
            </li>
          ))}
        </ul>
      </section>

      {/* PISA 2025 */}
      <section aria-labelledby="p2025" className="mt-12 rounded-2xl bg-navy-950 p-6 text-white md:p-8">
        <h2 id="p2025" className="font-display text-2xl font-bold">
          {t('explorer.whatispisa.p2025Title')}
        </h2>
        <ul className="mt-4 space-y-3 text-white/85">
          <li className="flex gap-2"><span aria-hidden="true">▸</span>{t('explorer.whatispisa.p2025Science')}</li>
          <li className="flex gap-2"><span aria-hidden="true">▸</span>{t('explorer.whatispisa.p2025Digital')}</li>
          <li className="flex gap-2"><span aria-hidden="true">▸</span>{t('explorer.whatispisa.p2025Language')}</li>
        </ul>
        <p className="mt-4 text-sm font-semibold text-white/70">{t('explorer.whatispisa.p2025Note')}</p>
        <Link
          to="/pisa-results-2025"
          className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-navy-950 hover:bg-mist"
        >
          {t('explorer.whatispisa.exploreCta')}
        </Link>
      </section>
    </div>
  );
}
