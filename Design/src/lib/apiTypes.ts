import type { Hunter, HunterStatus } from './db';

export type HunterLookupResult = {
  ok: boolean;
  message: string;
  session_id: string;
  mantra_id: string;
  mantra_code: string;
  hunter: Hunter | null;
  mapSetId?: string;
  assignedClueIds?: string[];
};

export type ClaimAuditEntry = {
  sessionId: string;
  mantraId: string;
  hunterStatus: 'HUNTING' | 'FINISHED' | 'CLAIMED' | 'UNKNOWN';
  updatedAt: number;
  deviceFingerprint?: string;
  browserId?: string;
};

export type ClaimAuditResult = {
  ok: boolean;
  message: string;
  sessionId: string;
  mantraId: string;
  totalUserClaims: number;
  repeatHistory: ClaimAuditEntry[];
};

export type ValidateNodeRequest = {
  session_id?: string;
  mantra_id: string;
  scanned_payload: string;
};

export type ActiveHunterSummary = {
  session_id: string;
  mantra_id: string;
  mantra_code: string;
  status: HunterStatus;
  scanned_count: number;
  assigned_count: number;
};

export type ValidateNodeResult = {
  ok: boolean;
  message: string;
  session_id: string;
  mantra_id: string;
  mantra_code: string;
  status: HunterStatus;
  scanned_count: number;
  assigned_count: number;
  scanned_nodes: string[];
  hunter: Hunter | null;
  assigned_clue_ids?: string[];
};

export type GenerateMantraOptions = {
  maxAttempts?: number;
  excludedMapSetIds?: string[];
  completedMapSetIds?: string[];
};
