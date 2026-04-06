import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FrontendType } from '@/types/connections';

interface FrameworkStore {
  framework: FrontendType;
  setFramework: (fw: FrontendType) => void;
}

export const useFrameworkStore = create<FrameworkStore>()(
  persist(
    (set) => ({
      framework: 'copilotkit',
      setFramework: (framework) => set({ framework }),
    }),
    { name: 'frontend-framework' }
  )
);
