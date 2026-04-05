import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FrontendType } from '@/types/connections';

interface FrontendStore {
  /** The active frontend SDK used for rendering */
  activeFrontend: FrontendType;
  setActiveFrontend: (frontend: FrontendType) => void;
}

export const useFrontendStore = create<FrontendStore>()(
  persist(
    (set) => ({
      activeFrontend: 'copilotkit',
      setActiveFrontend: (activeFrontend) => set({ activeFrontend }),
    }),
    { name: 'frontend-sdk-selection' },
  ),
);
