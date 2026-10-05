// ─── OECD / official-data contracts ─────────────────────────────────────────
// Everything under src/data/oecd/ is OFFICIAL DATA (published OECD figures).
// Never invent a score: a missing value means the economy did not participate
// or the figure was not verified — the UI must render "No data".

export type Domain = 'math' | 'reading' | 'science';

export interface PisaCycleResult {
  /** ISO-ish economy code, e.g. "ESP", "SGP", "FIN", "USA", "OAVG" (OECD average pseudo-row) */
  countryCode: string;
  mathematics?: number;
  reading?: number;
  science?: number;
  /** standard errors when published */
  mathSE?: number;
  readingSE?: number;
  scienceSE?: number;
}

export interface PisaCycleFile {
  meta: {
    source: 'OECD PISA';
    cycle: number;
    publicationYear: number;
    lastUpdated: string;
    url: string;
    majorDomain: Domain | 'digital';
    notes?: string;
  };
  results: PisaCycleResult[];
}

export interface CountryMeta {
  code: string;
  nameEn: string;
  nameEs: string;
  oecd: boolean;
  region: 'Europe' | 'Asia' | 'North America' | 'Latin America' | 'Oceania' | 'Middle East' | 'Africa' | 'OECD';
  /** ISO 3166-1 alpha-2 for flag emoji rendering, or "" when not applicable */
  flag: string;
}

export interface CycleTimelineEntry {
  year: number;
  majorDomain: string;
  majorDomainEs: string;
  participants: number;
  innovationsEn: string[];
  innovationsEs: string[];
  trendsEn: string;
  trendsEs: string;
}

export const PISA_CYCLES = [2000, 2003, 2006, 2009, 2012, 2015, 2018, 2022, 2025] as const;
export type PisaCycle = (typeof PISA_CYCLES)[number];

/** OECD averages per cycle — populated from src/data/oecd/sources-verified data. */
export interface OecdAverages {
  [cycle: number]: { mathematics: number; reading: number; science: number };
}
