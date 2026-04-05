// ─── Agent Connection Types ───

export type FrontendType = 'copilotkit' | 'tambo';

export type RuntimeType = 'langchain' | 'langgraph' | 'langsmith' | 'deepagents';

export type AuthMode = 'none' | 'bearer' | 'api-key' | 'custom-header';

export interface AuthConfig {
  mode: AuthMode;
  /** Env var name holding the token/key */
  tokenEnv?: string;
  /** Direct token value (for local dev only) */
  tokenValue?: string;
  /** Custom header name (for custom-header mode) */
  headerName?: string;
}

export interface ConnectionProfile {
  id: string;
  name: string;
  frontend: FrontendType;
  runtime: RuntimeType;
  baseUrl: string;
  /** Agent ID / Assistant ID / Graph ID */
  agentId?: string;
  auth: AuthConfig;
  /** Extra env/config values passed to the runtime */
  env?: Record<string, string>;
  /** Last validation result */
  lastValidation?: ConnectionValidationResult;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionStatus = 'idle' | 'validating' | 'connected' | 'error';

export interface ConnectionValidationResult {
  status: 'ok' | 'error' | 'warning';
  capabilities: string[];
  errors: DiagnosticError[];
  warnings: DiagnosticError[];
  timestamp: string;
}

export type DiagnosticSeverity = 'blocking' | 'partial' | 'warning';

export type FixLocation =
  | 'frontend configuration'
  | 'agent configuration'
  | 'deployment setup'
  | 'authentication'
  | 'network/infrastructure';

export interface DiagnosticError {
  code: string;
  whatFailed: string;
  likelyReason: string;
  nextAction: string;
  fixLocation: FixLocation;
  severity: DiagnosticSeverity;
}
