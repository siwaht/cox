import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LLMProvider = 'openai' | 'gemini' | 'anthropic';

export interface LLMModel {
  id: string;
  label: string;
  provider: LLMProvider;
}

export const AVAILABLE_MODELS: LLMModel[] = [
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-haiku-3-5-20241022', label: 'Claude Haiku 3.5', provider: 'anthropic' },
];

interface LLMStore {
  provider: LLMProvider;
  modelId: string;
  apiKeys: Record<LLMProvider, string>;
  setProvider: (p: LLMProvider) => void;
  setModelId: (id: string) => void;
  setApiKey: (provider: LLMProvider, key: string) => void;
  getActiveKey: () => string;
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      provider: 'openai',
      modelId: 'gpt-4o-mini',
      apiKeys: { openai: '', gemini: '', anthropic: '' },
      setProvider: (provider) => {
        const firstModel = AVAILABLE_MODELS.find((m) => m.provider === provider);
        set({ provider, modelId: firstModel?.id || '' });
      },
      setModelId: (modelId) => set({ modelId }),
      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
      getActiveKey: () => {
        const s = get();
        return s.apiKeys[s.provider] || '';
      },
    }),
    { name: 'copilotkit-llm-config' },
  ),
);
