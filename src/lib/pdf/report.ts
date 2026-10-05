// Personal PISA Simulator PDF report — pure client-side (jsPDF).
// Language follows result.language. Restrained academic palette, A4.
import { jsPDF } from 'jspdf';
import type { Domain } from '../../types/oecd';
import type { TestResult } from '../../types/simulator';
import { trackEvent } from '../analytics';
import { simulator as simEn } from '../../i18n/en/simulator';
import { simulator as simEs } from '../../i18n/es/simulator';

type Dict = typeof simEn;

export interface PdfOptions {
  countryCode?: string;
  countryName?: string;
  countryScores?: { mathematics?: number; reading?: number; science?: number };
}

const NAVY: [number, number, number] = [14, 42, 82];
const INK: [number, number, number] = [16, 24, 40];
const GREY: [number, number, number] = [71, 84, 103];
const LIGHT: [number, number, number] = [228, 233, 242];
const FAINT: [number, number, number] = [244, 246, 250];
const DOMAIN_HEX: Record<Domain, [number, number, number]> = {
  math: [37, 99, 235],
  reading: [180, 83, 9],
  science: [5, 150, 105],
};
const DOMAIN_KEY: Record<Domain, 'mathematics' | 'reading' | 'science'> = {
  math: 'mathematics',
  reading: 'reading',
  science: 'science',
};

// Official PISA 2025 OECD averages (project spec; DATA agent to confirm).
const OECD_2025 = { mathematics: 463, reading: 461, science: 482 };

const PAGE_W = 210;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'participant';
}

function dateISO(d: string): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return new Date().toISOString().slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

function longDate(d: string, lang: 'en' | 'es'): string {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

function modeName(mode: TestResult['testMode'], lang: 'en' | 'es'): string {
  const map = {
    quick: { en: 'Quick Simulation (18 questions)', es: 'Simulación rápida (18 preguntas)' },
    standard: { en: 'Standard Simulation (36 questions)', es: 'Simulación estándar (36 preguntas)' },
    full: { en: 'Full Simulation (64 questions)', es: 'Simulación completa (64 preguntas)' },
  } as const;
  return map[mode][lang];
}

function domainLabel(d: Domain, lang: 'en' | 'es'): string {
  const map = {
    math: { en: 'Mathematics', es: 'Matemáticas' },
    reading: { en: 'Reading', es: 'Lectura' },
    science: { en: 'Science', es: 'Ciencias' },
  } as const;
  return map[d][lang];
}

export function downloadPdf(result: TestResult, opts: PdfOptions): void {
  trackEvent('pdf_downloaded');
  const lang = result.language;
  const S: Dict = lang === 'es' ? (simEs as unknown as Dict) : simEn;
  const P = S.pdf;
  const comp = S.competencies as unknown as Record<string, Record<string, string>>;
  /** competency key like "math.reasoning" → localized label */
  const compLabel = (key: string): string => {
    const dot = key.indexOf('.');
    if (dot > 0) {
      const label = comp[key.slice(0, dot)]?.[key.slice(dot + 1)];
      if (label) return label;
    }
    return key;
  };
  const recs = S.recommendations as unknown as Record<string, { title: string; text: string }>;
  const levels = S.levels as unknown as Record<Domain, Record<number, string>>;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 0;

  function ensureSpace(needed: number) {
    if (y + needed > 277) {
      contentHeader();
    }
  }

  function contentHeader() {
    doc.addPage();
    y = 20;
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(P.coverTitle, MARGIN, 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(result.participantName, PAGE_W - MARGIN, 9, { align: 'right' });
    y = 24;
  }

  function h1(text: string) {
    ensureSpace(18);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(text, MARGIN, y);
    y += 4;
    doc.setDrawColor(...LIGHT);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 8;
  }

  function h2(text: string) {
    ensureSpace(14);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(text, MARGIN, y);
    y += 7;
  }

  function para(text: string, size = 10, color: [number, number, number] = INK, gap = 5) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    ensureSpace(lines.length * (size * 0.45) + gap);
    doc.text(lines, MARGIN, y);
    y += lines.length * (size * 0.45) + gap;
  }

  function bar(label: string, value01: number, color: [number, number, number], showPct = true) {
    ensureSpace(12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(label, MARGIN, y + 3.2);
    if (showPct) {
      doc.setTextColor(...GREY);
      doc.text(`${Math.round(value01 * 100)}%`, MARGIN + CONTENT_W, y + 3.2, { align: 'right' });
    }
    const barX = MARGIN;
    const barW = CONTENT_W;
    const barY = y + 5.5;
    doc.setFillColor(...FAINT);
    doc.roundedRect(barX, barY, barW, 3.4, 1.2, 1.2, 'F');
    doc.setFillColor(...color);
    const w = Math.max(0, Math.min(1, value01)) * barW;
    if (w > 0.5) doc.roundedRect(barX, barY, w, 3.4, 1.2, 1.2, 'F');
    y += 12;
  }

  function scoreRow(label: string, score: number, lo: number, hi: number, color: [number, number, number]) {
    ensureSpace(24);
    doc.setFillColor(...FAINT);
    doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, 'F');
    doc.setFillColor(...color);
    doc.rect(MARGIN, y, 2.2, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(label, MARGIN + 6, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GREY);
    doc.text(`${P.indicativeRange}: ${Math.round(lo)}–${Math.round(hi)}`, MARGIN + 6, y + 14.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...INK);
    doc.text(String(Math.round(score)), MARGIN + CONTENT_W - 6, y + 13, { align: 'right' });
    y += 26;
  }

  // ── PAGE 1 · cover ──────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 92, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text(P.coverTitle, MARGIN, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text(P.coverSubtitle, MARGIN, 50);
  doc.setFontSize(10);
  doc.setTextColor(210, 220, 235);
  doc.text(P.generatedBy, MARGIN, 66);
  y = 108;
  const rows: Array<[string, string]> = [
    [P.participant, result.participantName],
    [P.date, longDate(result.dateISO, lang)],
    [P.assessment, modeName(result.testMode, lang)],
    [P.language, P.languageName],
  ];
  doc.setFontSize(11);
  for (const [k, v] of rows) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(k, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    doc.text(v, MARGIN + 42, y);
    y += 9;
  }
  y += 8;
  doc.setFillColor(255, 248, 235);
  doc.setDrawColor(200, 160, 60);
  doc.setLineWidth(0.5);
  const discLines = doc.splitTextToSize(S.setup.disclaimer, CONTENT_W - 10);
  const boxH = discLines.length * 5 + 12;
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, 'FD');
  doc.setFontSize(9.5);
  doc.setTextColor(120, 80, 20);
  doc.text(discLines, MARGIN + 5, y + 8);
  y += boxH;

  // ── PAGE 2 · executive summary ──────────────────────────────────────
  contentHeader();
  h1(P.executiveSummary);
  // overall indicator card
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, y, CONTENT_W, 34, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(P.overallIndicator, MARGIN + 6, y + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(String(Math.round(result.overall)), MARGIN + 6, y + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `${P.indicativeRange}: ${Math.round(result.overallRange[0])}–${Math.round(result.overallRange[1])}`,
    MARGIN + CONTENT_W - 6,
    y + 25,
    { align: 'right' },
  );
  y += 42;

  const domains: Domain[] = ['math', 'reading', 'science'];
  for (const d of domains) {
    const ds = result.domains[d];
    scoreRow(domainLabel(d, lang), ds.score, ds.range[0], ds.range[1], DOMAIN_HEX[d]);
  }
  y += 2;
  para(`${P.strongest}: ${domainLabel(result.strongest, lang)}`, 10.5, INK, 3);
  para(`${P.weakest}: ${domainLabel(result.weakest, lang)}`, 10.5, INK, 3);

  // ── PAGES 3–5 · per-domain detail ───────────────────────────────────
  for (const d of domains) {
    const ds = result.domains[d];
    contentHeader();
    h1(P.domainSection.replace('{domain}', domainLabel(d, lang)));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...DOMAIN_HEX[d]);
    doc.text(`${P.estimatedScore}: ${Math.round(ds.score)}`, MARGIN, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    doc.text(`${P.indicativeRange}: ${Math.round(ds.range[0])}–${Math.round(ds.range[1])}`, MARGIN, y);
    y += 9;
    const lvl = ds.level;
    const lvlText = lvl <= 0 ? P.belowLevel1 : lvl >= 7 ? P.aboveLevel6 : P.levelLabel.replace('{n}', String(lvl));
    h2(`${P.estimatedLevel}: ${lvlText}`);
    const clamped = Math.min(6, Math.max(1, lvl));
    para(levels[d][clamped] ?? '', 10, INK, 6);
    h2(P.competencyProfile);
    const entries = Object.entries(ds.competencies)
      .map(([key, value]) => ({ key, label: compLabel(key), value }))
      .sort((a, b) => b.value - a.value);
    for (const e of entries) bar(e.label, e.value, DOMAIN_HEX[d]);
  }

  // ── PAGE 6 · comparative analysis ───────────────────────────────────
  contentHeader();
  h1(P.comparative);
  para(P.comparativeIntro, 10, GREY, 6);
  // table header
  const tableCols = opts.countryName ? 4 : 3;
  const colW = CONTENT_W / tableCols;
  const colCenter = (i: number) => MARGIN + colW * i + colW / 2;
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, y, CONTENT_W, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(P.you, colCenter(1), y + 6.2, { align: 'center' });
  doc.text(P.oecdAverage, colCenter(2), y + 6.2, { align: 'center' });
  if (opts.countryName) {
    const short = opts.countryName.length > 20 ? `${opts.countryName.slice(0, 19)}…` : opts.countryName;
    doc.text(short, colCenter(3), y + 6.2, { align: 'center' });
  }
  let cy = y + 9;
  for (const d of domains) {
    const ds = result.domains[d];
    if (cy + 10 > 275) {
      contentHeader();
      cy = y;
    }
    if ((domains.indexOf(d) % 2) === 0) {
      doc.setFillColor(...FAINT);
      doc.rect(MARGIN, cy, CONTENT_W, 10, 'F');
    }
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(domainLabel(d, lang), MARGIN + 3, cy + 6.8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(Math.round(ds.score)), colCenter(1), cy + 6.8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(String(OECD_2025[DOMAIN_KEY[d]]), colCenter(2), cy + 6.8, { align: 'center' });
    if (opts.countryName) {
      const v = opts.countryScores?.[DOMAIN_KEY[d]];
      doc.text(v === undefined ? '—' : String(Math.round(v)), colCenter(3), cy + 6.8, { align: 'center' });
    }
    cy += 10;
  }
  y = cy + 6;
  doc.setFillColor(255, 248, 235);
  const cdLines = doc.splitTextToSize(P.comparativeDisclaimer, CONTENT_W - 10);
  const cdH = cdLines.length * 5 + 12;
  ensureSpace(cdH + 4);
  doc.setDrawColor(200, 160, 60);
  doc.roundedRect(MARGIN, y, CONTENT_W, cdH, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(120, 80, 20);
  doc.text(cdLines, MARGIN + 5, y + 8);
  y += cdH;

  // ── PAGE 7 · question analysis ──────────────────────────────────────
  contentHeader();
  h1(P.questionAnalysis);
  const totalCorrect = domains.reduce((a, d) => a + result.domains[d].correct, 0);
  const totalAnsweredD = domains.reduce((a, d) => a + result.domains[d].answered, 0);
  const accuracy = totalAnsweredD > 0 ? totalCorrect / totalAnsweredD : 0;
  const mins = Math.round(result.totalTimeSeconds / 60);
  const analysisRows: Array<[string, string]> = [
    [P.questionsAnswered, `${result.totalAnswered} / ${result.totalQuestions}`],
    [P.accuracy, `${Math.round(accuracy * 100)}%`],
    [P.totalTime, P.minutes.replace('{n}', String(mins))],
  ];
  doc.setFontSize(11);
  for (const [k, v] of analysisRows) {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(k, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    doc.text(v, MARGIN + 62, y);
    y += 9;
  }
  y += 6;
  para(P.comparativeDisclaimer, 9, GREY, 4);

  // ── PAGE 8 · recommendations (deterministic from weakest competencies) ─
  contentHeader();
  h1(P.recommendations);
  para(P.recommendationsIntro, 10, GREY, 6);
  const weakest: Array<{ key: string; domain: Domain; value: number }> = [];
  for (const d of domains) {
    const sorted = Object.entries(result.domains[d].competencies)
      .map(([key, value]) => ({ key, domain: d, value }))
      .sort((a, b) => a.value - b.value);
    if (sorted[0]) weakest.push(sorted[0]);
  }
  weakest.sort((a, b) => a.value - b.value);
  for (const w of weakest.slice(0, 3)) {
    const r = recs[w.key];
    if (!r) continue;
    ensureSpace(30);
    doc.setFillColor(...FAINT);
    doc.setDrawColor(...LIGHT);
    const rTitle = `${P.priorityArea}: ${r.title} (${domainLabel(w.domain, lang)})`;
    const rLines = doc.splitTextToSize(r.text, CONTENT_W - 12);
    const rH = rLines.length * 5 + 22;
    ensureSpace(rH);
    doc.roundedRect(MARGIN, y, CONTENT_W, rH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(doc.splitTextToSize(rTitle, CONTENT_W - 12), MARGIN + 6, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(rLines, MARGIN + 6, y + 16);
    y += rH + 6;
  }

  // ── FINAL PAGE · methodological disclaimer ──────────────────────────
  contentHeader();
  h1(P.finalDisclaimerTitle);
  para(P.finalDisclaimer1, 10.5, INK, 5);
  para(P.finalDisclaimer2, 10.5, INK, 5);
  para(P.finalDisclaimer3, 10.5, INK, 5);
  para(P.finalDisclaimer4, 10.5, INK, 5);

  // footers with page numbers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(P.generatedBy, MARGIN, 290);
    doc.text(P.page.replace('{i}', String(i)).replace('{n}', String(total)), PAGE_W - MARGIN, 290, { align: 'right' });
  }

  const filename = `pisa-simulator-${slugify(result.participantName)}-${dateISO(result.dateISO)}.pdf`;
  doc.save(filename);
}
