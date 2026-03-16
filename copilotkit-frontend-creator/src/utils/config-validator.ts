// Validates imported workspace config JSON against expected schema

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_BLOCK_TYPES = [
  'chat', 'results', 'toolActivity', 'approvals', 'logs', 'form',
  'table', 'chart', 'dashboard', 'status', 'cards', 'panel', 'markdown', 'custom',
];

const VALID_FALLBACK_MODES = ['generic-copilotkit-workspace', 'minimal', 'chat-only'];
const VALID_FRONTENDS = ['copilotkit', 'tambo'];
const VALID_RUNTIMES = ['langchain', 'langgraph', 'deepagents'];
const VALID_AUTH_MODES = ['none', 'bearer', 'api-key', 'custom-header'];

export function validateImportConfig(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Config must be a JSON object'] };
  }

  const obj = data as Record<string, unknown>;

  // Workspace section
  if (!obj.workspace || typeof obj.workspace !== 'object') {
    errors.push('Missing "workspace" object');
    return { valid: false, errors };
  }

  const ws = obj.workspace as Record<string, unknown>;

  if (!Array.isArray(ws.blocks)) {
    errors.push('workspace.blocks must be an array');
  } else {
    ws.blocks.forEach((block: unknown, i: number) => {
      if (!block || typeof block !== 'object') {
        errors.push(`Block ${i}: must be an object`);
        return;
      }
      const b = block as Record<string, unknown>;
      if (!b.type || typeof b.type !== 'string') {
        errors.push(`Block ${i}: missing "type" string`);
      } else if (!VALID_BLOCK_TYPES.includes(b.type)) {
        errors.push(`Block ${i}: unknown type "${b.type}". Valid: ${VALID_BLOCK_TYPES.join(', ')}`);
      }
      if (b.w !== undefined && (typeof b.w !== 'number' || b.w < 1 || b.w > 12)) {
        errors.push(`Block ${i}: "w" must be 1-12`);
      }
      if (b.h !== undefined && (typeof b.h !== 'number' || b.h < 1 || b.h > 8)) {
        errors.push(`Block ${i}: "h" must be 1-8`);
      }
    });
  }

  if (ws.fallbackMode && !VALID_FALLBACK_MODES.includes(ws.fallbackMode as string)) {
    errors.push(`Invalid fallbackMode "${ws.fallbackMode}". Valid: ${VALID_FALLBACK_MODES.join(', ')}`);
  }

  // Connections section (optional)
  if (obj.connections !== undefined) {
    if (!Array.isArray(obj.connections)) {
      errors.push('"connections" must be an array');
    } else {
      (obj.connections as unknown[]).forEach((conn: unknown, i: number) => {
        if (!conn || typeof conn !== 'object') {
          errors.push(`Connection ${i}: must be an object`);
          return;
        }
        const c = conn as Record<string, unknown>;
        if (c.frontend && !VALID_FRONTENDS.includes(c.frontend as string)) {
          errors.push(`Connection ${i}: invalid frontend "${c.frontend}". Valid: ${VALID_FRONTENDS.join(', ')}`);
        }
        if (!c.runtime || !VALID_RUNTIMES.includes(c.runtime as string)) {
          errors.push(`Connection ${i}: invalid runtime "${c.runtime}". Valid: ${VALID_RUNTIMES.join(', ')}`);
        }
        if (!c.baseUrl || typeof c.baseUrl !== 'string') {
          errors.push(`Connection ${i}: missing "baseUrl"`);
        }
        if (c.auth && typeof c.auth === 'object') {
          const auth = c.auth as Record<string, unknown>;
          if (auth.mode && !VALID_AUTH_MODES.includes(auth.mode as string)) {
            errors.push(`Connection ${i}: invalid auth mode "${auth.mode}"`);
          }
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
