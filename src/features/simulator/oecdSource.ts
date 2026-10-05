// Data adapter for simulator-side OECD comparisons (results dashboard).
//
// INTEGRATION NOTE for the DATA agent / integrator:
// This module fetches the official datasets at runtime from DATA_BASE
// (default "/data/oecd" — works if pisa2025.json, countries.json and the
// per-cycle files are served under public/data/oecd/). If the datasets are
// bundled elsewhere (e.g. statically imported by the explorer pages), point
// DATA_BASE at the right location or replace fetchJson with the explorer's
// loader. Everything degrades gracefully: on any failure the UI shows the
// "historical data unavailable" state and "No data" cells instead of crashing.
//
// The embedded OECD_2025_AVG values are the figures given in the project
// spec (Science 482, Mathematics 463, Reading 461) and the historical
// averages are the officially published OECD cycle averages — both pending
// DATA-agent verification against the dataset files. Never invent scores:
// country-level scores come ONLY from the dataset files.
import type { Domain } from '../../types/oecd';

export interface CountryScoreRow {
  code: string;
  nameEn: string;
  nameEs: string;
  /** ISO 3166-1 alpha-2 for flag rendering, "" when not applicable */
  flag: string;
  oecd: boolean;
  mathematics?: number;
  reading?: number;
  science?: number;
}

export interface CycleAverages {
  [cycle: number]: { mathematics: number; reading: number; science: number };
}

/** Official PISA 2025 OECD averages (project spec). DATA agent to confirm. */
export const OECD_2025_AVG = { mathematics: 463, reading: 461, science: 482 };

/** Officially published OECD cycle averages, 2012–2025. DATA agent to confirm. */
export const OECD_CYCLE_AVG: CycleAverages = {
  2012: { mathematics: 494, reading: 496, science: 501 },
  2015: { mathematics: 490, reading: 493, science: 493 },
  2018: { mathematics: 489, reading: 487, science: 489 },
  2022: { mathematics: 472, reading: 476, science: 485 },
  2025: OECD_2025_AVG,
};

export const HISTORY_CYCLES = [2012, 2015, 2018, 2022, 2025] as const;

/**
 * Minimal fallback country metadata (names/flags only — NO scores).
 * Used only when the dataset files cannot be loaded, so the country
 * selector still renders while every score cell shows "No data".
 */
const FALLBACK_COUNTRIES: CountryScoreRow[] = [
  { code: 'ESP', nameEn: 'Spain', nameEs: 'España', flag: 'ES', oecd: true },
  { code: 'FIN', nameEn: 'Finland', nameEs: 'Finlandia', flag: 'FI', oecd: true },
  { code: 'SGP', nameEn: 'Singapore', nameEs: 'Singapur', flag: 'SG', oecd: false },
  { code: 'USA', nameEn: 'United States', nameEs: 'Estados Unidos', flag: 'US', oecd: true },
  { code: 'DEU', nameEn: 'Germany', nameEs: 'Alemania', flag: 'DE', oecd: true },
  { code: 'FRA', nameEn: 'France', nameEs: 'Francia', flag: 'FR', oecd: true },
  { code: 'GBR', nameEn: 'United Kingdom', nameEs: 'Reino Unido', flag: 'GB', oecd: true },
  { code: 'ITA', nameEn: 'Italy', nameEs: 'Italia', flag: 'IT', oecd: true },
  { code: 'PRT', nameEn: 'Portugal', nameEs: 'Portugal', flag: 'PT', oecd: true },
  { code: 'NLD', nameEn: 'Netherlands', nameEs: 'Países Bajos', flag: 'NL', oecd: true },
  { code: 'JPN', nameEn: 'Japan', nameEs: 'Japón', flag: 'JP', oecd: true },
  { code: 'KOR', nameEn: 'Korea', nameEs: 'Corea del Sur', flag: 'KR', oecd: true },
  { code: 'CAN', nameEn: 'Canada', nameEs: 'Canadá', flag: 'CA', oecd: true },
  { code: 'AUS', nameEn: 'Australia', nameEs: 'Australia', flag: 'AU', oecd: true },
  { code: 'SWE', nameEn: 'Sweden', nameEs: 'Suecia', flag: 'SE', oecd: true },
  { code: 'POL', nameEn: 'Poland', nameEs: 'Polonia', flag: 'PL', oecd: true },
  { code: 'EST', nameEn: 'Estonia', nameEs: 'Estonia', flag: 'EE', oecd: true },
  { code: 'IRL', nameEn: 'Ireland', nameEs: 'Irlanda', flag: 'IE', oecd: true },
  { code: 'CHE', nameEn: 'Switzerland', nameEs: 'Suiza', flag: 'CH', oecd: true },
  { code: 'MEX', nameEn: 'Mexico', nameEs: 'México', flag: 'MX', oecd: true },
  { code: 'BRA', nameEn: 'Brazil', nameEs: 'Brasil', flag: 'BR', oecd: false },
  { code: 'CHL', nameEn: 'Chile', nameEs: 'Chile', flag: 'CL', oecd: true },
  { code: 'COL', nameEn: 'Colombia', nameEs: 'Colombia', flag: 'CO', oecd: true },
  { code: 'PER', nameEn: 'Peru', nameEs: 'Perú', flag: 'PE', oecd: false },
  { code: 'TUR', nameEn: 'Türkiye', nameEs: 'Turquía', flag: 'TR', oecd: true },
  { code: 'GRC', nameEn: 'Greece', nameEs: 'Grecia', flag: 'GR', oecd: true },
];

const DATA_BASE = '/data/oecd';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DATA_BASE}/${path}`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`missing ${path}`);
  return (await res.json()) as T;
}

interface CycleFile {
  results: Array<{
    countryCode: string;
    mathematics?: number;
    reading?: number;
    science?: number;
  }>;
}
interface CountriesFile {
  countries?: CountryScoreRow[];
}

function domainKey(d: Domain): 'mathematics' | 'reading' | 'science' {
  return d === 'math' ? 'mathematics' : d;
}

export interface CompareData {
  countries: CountryScoreRow[];
  averages: CycleAverages;
  /** false when the dataset files could not be loaded (fallback in use) */
  live: boolean;
}

let cache: Promise<CompareData> | null = null;

/** Load country 2025 scores + historical OECD averages. Never throws. */
export function getCompareData(): Promise<CompareData> {
  if (!cache) {
    cache = (async (): Promise<CompareData> => {
      try {
        const [cycle2025, meta] = await Promise.all([
          fetchJson<CycleFile>('pisa2025.json'),
          fetchJson<CountriesFile | CountryScoreRow[]>('countries.json'),
        ]);
        const metas: CountryScoreRow[] = Array.isArray(meta)
          ? meta
          : (meta.countries ?? FALLBACK_COUNTRIES);
        const byCode = new Map(cycle2025.results.map((r) => [r.countryCode, r]));
        const countries = metas
          .filter((c) => c.code !== 'oecd-average')
          .map((c) => {
            const r = byCode.get(c.code);
            return {
              code: c.code,
              nameEn: c.nameEn,
              nameEs: c.nameEs,
              flag: c.flag ?? '',
              oecd: c.oecd ?? false,
              mathematics: r?.mathematics,
              reading: r?.reading,
              science: r?.science,
            };
          })
          .sort((a, b) => a.nameEn.localeCompare(b.nameEn));

        // Try to refine historical averages from per-cycle files; keep
        // published constants for any cycle that fails to load.
        const averages: CycleAverages = { ...OECD_CYCLE_AVG };
        await Promise.all(
          HISTORY_CYCLES.map(async (year) => {
            try {
              const f = await fetchJson<CycleFile>(`pisa${year}.json`);
              const oavg = f.results.find((r) => r.countryCode === 'oecd-average');
              if (oavg?.mathematics && oavg?.reading && oavg?.science) {
                averages[year] = {
                  mathematics: oavg.mathematics,
                  reading: oavg.reading,
                  science: oavg.science,
                };
              }
            } catch {
              /* keep constant */
            }
          }),
        );
        return { countries, averages, live: true };
      } catch {
        return { countries: FALLBACK_COUNTRIES, averages: OECD_CYCLE_AVG, live: false };
      }
    })();
  }
  return cache;
}

export function countryName(c: CountryScoreRow, lang: 'en' | 'es'): string {
  return lang === 'es' ? c.nameEs : c.nameEn;
}

export function scoreOf(c: CountryScoreRow, d: Domain): number | undefined {
  return c[domainKey(d)];
}

/** Regional-indicator flag from an ISO alpha-2 code. */
export function flagEmoji(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return '';
  return String.fromCodePoint(
    ...[...alpha2.toUpperCase()].map((ch) => 127397 + ch.charCodeAt(0)),
  );
}
