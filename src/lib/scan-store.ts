"use client";

import { create } from "zustand";

/**
 * Bridge between the IP scanner and the config generator:
 * the scanner pushes its best verified endpoints here, the generator reads them.
 */
export interface ScannerEndpoint {
  endpoint: string; // ip:port (WG UDP)
  localMs: number | null;
  serverMs: number | null;
  score: number;
  at: number;
}

interface ScannerBridgeState {
  best: ScannerEndpoint | null;
  results: ScannerEndpoint[];
  /** bump when scanner page runs so generator can show fresh hint */
  scanRunAt: number | null;
  pushResults: (results: ScannerEndpoint[]) => void;
  pick: (endpoint: ScannerEndpoint) => void;
  clear: () => void;
}

export const useScannerBridge = create<ScannerBridgeState>((set) => ({
  best: null,
  results: [],
  scanRunAt: null,
  pushResults: (results) => {
    const sorted = [...results].sort((a, b) => b.score - a.score);
    set({
      results: sorted,
      best: sorted[0] ?? null,
      scanRunAt: Date.now(),
    });
  },
  pick: (endpoint) => set({ best: endpoint }),
  clear: () => set({ best: null, results: [], scanRunAt: null }),
}));
