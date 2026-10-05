import { common } from './common';
import { explorer } from './explorer';
import { simulator as sim } from './simulator';

export const es = {
  common,
  explorer,
  sim,
} as const;

export type EsDict = typeof es;
