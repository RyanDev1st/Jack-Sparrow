import type { Hunter, HunterStatus } from './db';

export type HunterLookupResult = {
  ok: boolean;
  message: string;
  mantra_id: string;
  hunter: Hunter | null;
};

export type ValidateNodeResult = {
  ok: boolean;
  message: string;
  mantra_id: string;
  status: HunterStatus;
  scanned_count: number;
  assigned_count: number;
  hunter: Hunter | null;
};
