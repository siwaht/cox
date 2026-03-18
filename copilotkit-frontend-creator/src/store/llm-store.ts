import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LLMProvider = 'openai' | 'gemini' | 'anthropic' | 'mistral';

export interface LLMModel {
  id: string;
  label: string;
  provider: LLMProvider;
}

export const AVAILABLE_MODELS: LLMModel[] = [
  // OpenAI
  { id: 'o3', label: 'o3 (reasoning)', provider: 'openai' },
  { id: 'o3-mini', label: 'o3 Mini', provider: 'openai' },
  { id: 'o4-mini', label: 'o4 Mini (reasoning)', provider: 'openai' },
  { id: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', provider: 'openai' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  // Google Gemini
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini' },
  // Anthropic
  { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', provider: 'anthropic' },
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'anthropic' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-haiku-3-5-20241022', label: 'Claude Haiku 3.5', provider: 'anthropic' },
  // Mistral
  { id: 'mistral-large-latest', label: 'Mistral Large', provider: 'mistral' },
  { id: 'mistral-medium-latest', label: 'Mistral Medium', provider: 'mistral' },
  { id: 'mistral-small-latest', label: 'Mistral Small', provider: 'mistral' },
  { id: 'codestral-latest', label: 'Codestral', provider: 'mistral' },
  { id: 'open-mistral-nemo', label: 'Mistral Nemo', provider: 'mistral' },
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
      modelId: 'gpt-4.1',
      apiKeys: { openai: '', gemini: '', anthropic: '', mistral: '' },
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
    {
      name: 'copilotkit-llm-config',
      // Only persist provider/model selection, NOT API keys.
      // Keys stay in memory and are cleared on page reload for security.
      partialize: (state) => ({
        provider: state.provider,
        modelId: state.modelId,
      }),
    },
  ),
);
