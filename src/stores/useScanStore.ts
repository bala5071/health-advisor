import { create } from 'zustand';

interface ScanState {
  currentScan: any | null;
  scanHistory: any[];
  loading: boolean;
  setCurrentScan: (scan: any) => void;
  addToScanHistory: (scan: any) => void;
  setLoading: (loading: boolean) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  currentScan: null,
  scanHistory: [],
  loading: false,
  setCurrentScan: (scan) => set({ currentScan: scan }),
  addToScanHistory: (scan) => set((state) => ({ scanHistory: [...state.scanHistory, scan] })),
  setLoading: (loading) => set({ loading }),
}));
