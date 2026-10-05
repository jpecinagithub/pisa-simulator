import type { Domain } from '../../types/oecd';

/** Score field names on PisaCycleResult / OECD average rows. */
export type ScoreField = 'mathematics' | 'reading' | 'science';

export const DOMAIN_FIELD: Record<Domain, ScoreField> = {
  math: 'mathematics',
  reading: 'reading',
  science: 'science',
};

/** Read a domain score from a result-like row ({ mathematics?, reading?, science? }). */
export function domainScore(
  row: { mathematics?: number; reading?: number; science?: number } | undefined,
  domain: Domain,
): number | undefined {
  return row?.[DOMAIN_FIELD[domain]];
}
