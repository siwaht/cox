import { create } from 'zustand';
import type { CodeAnalysis } from '@/adapters/code-analyzer';

interface CodeAnalysisStore {
  /** Latest code analysis result, null if no code entered */
  analysis: CodeAnalysis | null;
  /** Raw agent code input */
  rawCode: string;
  setAnalysis: (analysis: CodeAnalysis | null) => void;
  setRawCode: (code: string) => void;
}

export const useCodeAnalysisStore = create<CodeAnalysisStore>((set) => ({
  analysis: null,
  rawCode: '',
  setAnalysis: (analysis) => set({ analysis }),
  setRawCode: (rawCode) => set({ rawCode }),
}));
