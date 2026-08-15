import { create } from "zustand";

/**
 * UI-only state. All domain data lives in the backend database and is fetched
 * through TanStack Query — nothing here is a source of truth.
 */
interface UiState {
  connections: { ai: boolean; whatsapp: boolean; telegram: boolean };
  activeHospitalId: string | null;
  demoRunning: boolean;
  demoInquiryId: string | null;
  setActiveHospital: (id: string) => void;
  setDemo: (running: boolean, inquiryId?: string | null) => void;
}

export const useUi = create<UiState>((set) => ({
  connections: { ai: true, whatsapp: true, telegram: true },
  activeHospitalId: null,
  demoRunning: false,
  demoInquiryId: null,
  setActiveHospital: (id) => set({ activeHospitalId: id }),
  setDemo: (running, inquiryId) =>
    set((state) => ({
      demoRunning: running,
      demoInquiryId: inquiryId === undefined ? state.demoInquiryId : inquiryId,
    })),
}));
