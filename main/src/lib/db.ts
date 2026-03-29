export type HunterStatus = 'HUNTING' | 'FINISHED' | 'CLAIMED';

export type Hunter = {
  session_id: string;
  mantra_id: string;
  mantra_code: string;
  assigned_map: string[];
  assigned_clue_ids?: string[];
  scanned_nodes: string[];
  status: HunterStatus;
  map_set_id?: string;
  completed_map_sets?: string[];
};
