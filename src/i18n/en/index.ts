import { common } from './common';
import { explorer } from './explorer';
import { simulator as sim } from './simulator';

export const en = {
  common,
  explorer,
  sim,
} as const;

export type EnDict = typeof en;
