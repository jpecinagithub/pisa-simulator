// ─── OECD official-data accessors ────────────────────────────────────────────
// Reads the curated official datasets under src/data/oecd/. Everything here is
// OFFICIAL OECD data; simulator-generated data lives elsewhere and must never
// be mixed in silently.

import type { CountryMeta, CycleTimelineEntry, PisaCycleFile, PisaCycleResult } from '../types/oecd';

import pisa2000 from '../data/oecd/pisa2000.json';
import pisa2003 from '../data/oecd/pisa2003.json';
import pisa2006 from '../data/oecd/pisa2006.json';
import pisa2009 from '../data/oecd/pisa2009.json';
import pisa2012 from '../data/oecd/pisa2012.json';
import pisa2015 from '../data/oecd/pisa2015.json';
import pisa2018 from '../data/oecd/pisa2018.json';
import pisa2022 from '../data/oecd/pisa2022.json';
import pisa2025 from '../data/oecd/pisa2025.json';
import countries from '../data/oecd/countries.json';
import timeline from '../data/oecd/timeline.json';

export const OECD_AVERAGE_CODE = 'oecd-average';

const CYCLES: Record<number, PisaCycleFile> = {
  2000: pisa2000 as PisaCycleFile,
  2003: pisa2003 as PisaCycleFile,
  2006: pisa2006 as PisaCycleFile,
  2009: pisa2009 as PisaCycleFile,
  2012: pisa2012 as PisaCycleFile,
  2015: pisa2015 as PisaCycleFile,
  2018: pisa2018 as PisaCycleFile,
  2022: pisa2022 as PisaCycleFile,
  2025: pisa2025 as PisaCycleFile,
};

export function getCycleResults(year: number): PisaCycleResult[] {
  return CYCLES[year]?.results ?? [];
}

export function getCycleMeta(year: number): PisaCycleFile['meta'] | undefined {
  return CYCLES[year]?.meta;
}

export function listCountries(): CountryMeta[] {
  return countries as CountryMeta[];
}

export function getCountry(code: string): CountryMeta | undefined {
  return (countries as CountryMeta[]).find((c) => c.code === code);
}

export function getCountrySeries(code: string): {
  year: number;
  mathematics?: number;
  reading?: number;
  science?: number;
}[] {
  const series: { year: number; mathematics?: number; reading?: number; science?: number }[] = [];
  for (const year of Object.keys(CYCLES).map(Number).sort((a, b) => a - b)) {
    const row = CYCLES[year].results.find((r) => r.countryCode === code);
    if (row) {
      series.push({
        year,
        mathematics: row.mathematics,
        reading: row.reading,
        science: row.science,
      });
    }
  }
  return series;
}

export function getOecdAverage(
  year: number,
): { mathematics: number; reading: number; science: number } | undefined {
  const row = CYCLES[year]?.results.find((r) => r.countryCode === OECD_AVERAGE_CODE);
  if (
    row == null ||
    row.mathematics == null ||
    row.reading == null ||
    row.science == null
  ) {
    return undefined;
  }
  return { mathematics: row.mathematics, reading: row.reading, science: row.science };
}

/** Case-insensitive prefix-first search over English and Spanish names. */
export function searchCountries(q: string): CountryMeta[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const all = countries as CountryMeta[];
  const prefix: CountryMeta[] = [];
  const contains: CountryMeta[] = [];
  for (const c of all) {
    const en = c.nameEn.toLowerCase();
    const es = c.nameEs.toLowerCase();
    if (en.startsWith(needle) || es.startsWith(needle)) {
      prefix.push(c);
    } else if (en.includes(needle) || es.includes(needle)) {
      contains.push(c);
    }
  }
  return [...prefix, ...contains];
}

export function getTimeline(): CycleTimelineEntry[] {
  return (timeline as CycleTimelineEntry[]).slice().sort((a, b) => a.year - b.year);
}
