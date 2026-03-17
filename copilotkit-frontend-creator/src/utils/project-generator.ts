// ─── Full Project Generator ───
// Generates a complete, deployable Vite + React + Tailwind + CopilotKit project
// from the current workspace configuration. Outputs a zip file.

import type { BlockConfig, BlockType } from '@/types/blocks';
import type { WorkspaceConfig, ThemeConfig } from '@/types/workspace';
import type { ConnectionProfile } from '@/types/connections';
import { DEFAULT_THEME } from '@/types/workspace';

export interface ProjectGenOptions {
  workspace: WorkspaceConfig;
  connection?: ConnectionProfile | null;
  includeEnvValues?: boolean;
}

interface GeneratedFile {
  path: string;
  content: string;
}

// ─── Block component code templates ───

const BLOCK_TEMPLATES: Record<BlockType, (block: BlockConfig) => string> = {
  chat: (b) => `import { CopilotChat } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

export function ChatBlock() {
  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="flex-1 overflow-hidden">
        <CopilotChat
          labels={{ title: "${b.label}", initial: "Send a message to start" }}
          className="h-full"
        />
      </div>
    </div>
  );
}`,

  results: (b) => `export function ResultsBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 text-sm text-zinc-400">
        <p>Agent results will appear here when connected.</p>
      </div>
    </div>
  );
}`,

  toolActivity: (b) => `export function ToolActivityBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 text-sm text-zinc-400">Tool calls will stream here.</div>
    </div>
  );
}`,

  approvals: (b) => `export function ApprovalsBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 text-sm text-zinc-400">Approval requests appear here.</div>
    </div>
  );
}`,

  logs: (b) => `export function LogsBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 font-mono text-xs text-zinc-500">Logs will appear here.</div>
    </div>
  );
}`,

  form: (b) => `export function FormBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 text-sm text-zinc-400">Form inputs go here.</div>
    </div>
  );
}`,

  table: (b) => `export function TableBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 text-sm text-zinc-400">Table data renders here.</div>
    </div>
  );
}`,

  chart: (b) => `export function ChartBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 text-sm text-zinc-400 flex items-center justify-center min-h-[100px]">Chart visualization</div>
    </div>
  );
}`,

  dashboard: (b) => `export function DashboardBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 text-sm text-zinc-400">Dashboard metrics go here.</div>
    </div>
  );
}`,

  status: (b) => `export function StatusBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-sm text-zinc-300">Connected</span>
      </div>
    </div>
  );
}`,

  cards: (b) => `export function CardsBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 grid grid-cols-2 gap-2">
        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-400">Card 1</div>
        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-400">Card 2</div>
      </div>
    </div>
  );
}`,

  panel: (b) => `export function PanelBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 text-sm text-zinc-400">Panel content</div>
    </div>
  );
}`,

  markdown: (b) => `export function MarkdownBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 prose prose-invert prose-sm max-w-none text-zinc-300">
        <p>Markdown content renders here.</p>
      </div>
    </div>
  );
}`,

  custom: (b) => `export function CustomBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 text-sm text-zinc-400">Custom block — add your own content here.</div>
    </div>
  );
}`,

  // ─── LangSmith-specific blocks ───

  traceViewer: (b) => `import { useState } from 'react';

export function TraceViewerBlock() {
  const [expanded, setExpanded] = useState(${(b.props as Record<string, unknown>).expandByDefault ?? false});

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">${b.label}</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      <div className="p-4 font-mono text-xs text-zinc-500 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Agent execution trace</span>
          ${(b.props as Record<string, unknown>).showLatency ? '<span className="ml-auto text-zinc-600">latency: --ms</span>' : ''}
        </div>
        ${(b.props as Record<string, unknown>).showTokens ? '<div className="text-zinc-600 text-right">tokens: --</div>' : ''}
        <p className="text-zinc-600">Connect to LangSmith to view execution traces.</p>
      </div>
    </div>
  );
}`,

  feedback: (b) => `import { useState } from 'react';

export function FeedbackBlock() {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRating('up')}
            className={\`px-3 py-1.5 rounded-lg text-sm transition-colors \${
              rating === 'up' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }\`}
          >
            \u{1F44D} Good
          </button>
          <button
            onClick={() => setRating('down')}
            className={\`px-3 py-1.5 rounded-lg text-sm transition-colors \${
              rating === 'down' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }\`}
          >
            \u{1F44E} Bad
          </button>
        </div>
        ${(b.props as Record<string, unknown>).allowComment ? `<textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 resize-none"
          rows={2}
        />` : ''}
      </div>
    </div>
  );
}`,

  dataset: (b) => `export function DatasetBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Dataset Examples</span>
          <span>Max: ${(b.props as Record<string, unknown>).maxRows ?? 50} rows</span>
        </div>
        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-400">
          Connect to LangSmith to browse datasets and examples.
        </div>
      </div>
    </div>
  );
}`,

  annotationQueue: (b) => `export function AnnotationQueueBlock() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4 space-y-2">
        ${(b.props as Record<string, unknown>).showPriority ? '<div className="flex items-center gap-2 text-xs text-zinc-500"><span className="w-2 h-2 rounded-full bg-yellow-500" /><span>Priority queue</span></div>' : ''}
        <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-400">
          Annotation queue items will appear here for human review.
        </div>
      </div>
    </div>
  );
}`,

  // ─── Deep Agent-specific blocks ───

  reasoningChain: (b) => `import { useState } from 'react';

export function ReasoningChainBlock() {
  const [collapsed, setCollapsed] = useState(false);

  const steps = [
    { step: 1, text: 'Analyzing input...', confidence: 0.92 },
    { step: 2, text: 'Reasoning about approach...', confidence: 0.87 },
    { step: 3, text: 'Generating response...', confidence: 0.95 },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">${b.label}</span>
        ${(b.props as Record<string, unknown>).collapsible ? `<button
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>` : ''}
      </div>
      {!collapsed && (
        <div className="p-4 space-y-2">
          {steps.map((s) => (
            <div key={s.step} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                {s.step}
              </span>
              <span className="text-zinc-300 flex-1">{s.text}</span>
              ${(b.props as Record<string, unknown>).showConfidence ? '<span className="text-xs text-zinc-600">{(s.confidence * 100).toFixed(0)}%</span>' : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`,

  subAgentTree: (b) => `export function SubAgentTreeBlock() {
  const agents = [
    { name: 'Coordinator', status: 'active', children: [
      { name: 'Research Agent', status: 'working', children: [] },
      { name: 'Analysis Agent', status: 'idle', children: [
        { name: 'Data Processor', status: 'idle', children: [] },
      ]},
    ]},
  ];

  const statusColor = (s: string) => s === 'active' ? 'bg-green-500' : s === 'working' ? 'bg-blue-500' : 'bg-zinc-600';

  const renderAgent = (agent: typeof agents[0], depth = 0) => (
    <div key={agent.name} style={{ marginLeft: depth * 16 }} className="py-1">
      <div className="flex items-center gap-2">
        ${(b.props as Record<string, unknown>).showStatus ? '<span className={\`w-2 h-2 rounded-full \${statusColor(agent.status)}\`} />' : ''}
        <span className="text-sm text-zinc-300">{agent.name}</span>
        <span className="text-xs text-zinc-600">{agent.status}</span>
      </div>
      {agent.children.map((child) => renderAgent(child as typeof agents[0], depth + 1))}
    </div>
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
        ${b.label}
      </div>
      <div className="p-4">
        {agents.map((a) => renderAgent(a))}
      </div>
    </div>
  );
}`,

  depthIndicator: (b) => `export function DepthIndicatorBlock() {
  const currentDepth = 2;
  const maxDepth = ${(b.props as Record<string, unknown>).maxDepth ?? 5};
  const progress = (currentDepth / maxDepth) * 100;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden h-full">
      <div className="px-3.5 py-2.5 flex items-center gap-3">
        ${(b.props as Record<string, unknown>).showLabel ? '<span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">${b.label}</span>' : ''}
        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: \`\${progress}%\` }}
          />
        </div>
        <span className="text-xs text-zinc-500">{currentDepth}/{maxDepth}</span>
      </div>
    </div>
  );
}`,
};

// ─── Helpers ───

function blockComponentName(type: BlockType): string {
  return type.charAt(0).toUpperCase() + type.slice(1) + 'Block';
}

function uniqueBlockTypes(blocks: BlockConfig[]): BlockType[] {
  return [...new Set(blocks.filter((b) => b.visible).map((b) => b.type))];
}

// ─── File generators ───

function genPackageJson(name: string, _connection?: ConnectionProfile | null): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent-frontend';

  const deps: Record<string, string> = {
    '@copilotkit/react-core': '^1.8.0',
    '@copilotkit/react-ui': '^1.8.0',
    react: '^18.3.1',
    'react-dom': '^18.3.1',
  };

  return JSON.stringify({
    name: slug,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    },
    dependencies: deps,
    devDependencies: {
      '@types/react': '^18.3.0',
      '@types/react-dom': '^18.3.0',
      '@vitejs/plugin-react': '^4.3.0',
      autoprefixer: '^10.4.19',
      postcss: '^8.4.38',
      tailwindcss: '^3.4.4',
      typescript: '^5.5.0',
      vite: '^5.4.0',
    },
  }, null, 2);
}

function genViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
}

function genTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      isolatedModules: true,
      moduleDetection: 'force',
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
    },
    include: ['src'],
  }, null, 2);
}

function genTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
`;
}

function genPostcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function genIndexHtml(title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function genIndexCss(theme: ThemeConfig): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: ${theme.accentColor};
}

body {
  margin: 0;
  background: ${theme.bgColor};
  color: #e4e4e7;
  font-family: ${theme.fontFamily === 'mono' ? "'JetBrains Mono', monospace" : theme.fontFamily === 'inter' ? "'Inter', sans-serif" : 'system-ui, -apple-system, sans-serif'};
}
`;
}

function genMainTsx(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

function genAppTsx(
  blocks: BlockConfig[],
  connection: ConnectionProfile | null | undefined,
): string {
  const visible = blocks.filter((b) => b.visible);
  const types = uniqueBlockTypes(blocks);
  const imports = types.map(
    (t) => `import { ${blockComponentName(t)} } from './components/${blockComponentName(t)}';`,
  ).join('\n');

  const runtimeUrl = connection
    ? `'${connection.baseUrl.replace(/\/+$/, '')}/copilotkit'`
    : `import.meta.env.VITE_RUNTIME_URL || 'http://localhost:8000/copilotkit'`;

  const blockElements = visible.map((b) => {
    const comp = blockComponentName(b.type);
    return `        <div style={{ gridColumn: 'span ${b.w}', minHeight: '${b.h * 50}px' }}>
          <${comp} />
        </div>`;
  }).join('\n');

  const title = visible.length > 0 ? (visible[0].label || 'Agent Frontend') : 'Agent Frontend';

  return `import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';
${imports}

export function App() {
  const runtimeUrl = ${runtimeUrl};

  return (
    <CopilotKit runtimeUrl={runtimeUrl}>
      <div className="min-h-screen bg-zinc-950 text-zinc-200">
        <header className="flex items-center justify-between px-5 py-3 bg-zinc-900 border-b border-zinc-800">
          <h1 className="text-sm font-semibold">${title}</h1>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Connected
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-12 gap-3 auto-rows-min">
${blockElements}
          </div>
        </main>
      </div>
    </CopilotKit>
  );
}
`;
}

function genEnvExample(connection?: ConnectionProfile | null): string {
  const base = connection?.baseUrl || 'http://localhost:8000';

  return `# Agent Runtime
VITE_RUNTIME_URL=${base.replace(/\/+$/, '')}/copilotkit
VITE_AGENT_ID=${connection?.agentId || 'agent'}
`;
}

function genReadme(name: string): string {
  return `# ${name}

Generated by CopilotKit Frontend Creator.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Set your agent runtime URL in \`.env\`:

\`\`\`
VITE_RUNTIME_URL=http://localhost:8000/copilotkit
\`\`\`

## Deploy

\`\`\`bash
npm run build
\`\`\`

Deploy the \`dist/\` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc).
`;
}

function genViteEnvDts(): string {
  return `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RUNTIME_URL: string;
  readonly VITE_AGENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`;
}

// ─── Main generator ───

export function generateProjectFiles(opts: ProjectGenOptions): GeneratedFile[] {
  const { workspace, connection } = opts;
  const theme = workspace.customTheme || DEFAULT_THEME;
  const visible = workspace.blocks.filter((b) => b.visible);
  const types = uniqueBlockTypes(workspace.blocks);
  const files: GeneratedFile[] = [];

  // Root config files
  files.push({ path: 'package.json', content: genPackageJson(workspace.name, connection) });
  files.push({ path: 'vite.config.ts', content: genViteConfig() });
  files.push({ path: 'tsconfig.json', content: genTsConfig() });
  files.push({ path: 'tailwind.config.js', content: genTailwindConfig() });
  files.push({ path: 'postcss.config.js', content: genPostcssConfig() });
  files.push({ path: 'index.html', content: genIndexHtml(workspace.name) });
  files.push({ path: '.env.example', content: genEnvExample(connection) });
  files.push({ path: 'README.md', content: genReadme(workspace.name) });

  // Source files
  files.push({ path: 'src/main.tsx', content: genMainTsx() });
  files.push({ path: 'src/index.css', content: genIndexCss(theme) });
  files.push({ path: 'src/vite-env.d.ts', content: genViteEnvDts() });
  files.push({ path: 'src/App.tsx', content: genAppTsx(visible, connection) });

  // Block components
  for (const type of types) {
    const block = visible.find((b) => b.type === type)!;
    const template = BLOCK_TEMPLATES[type];
    if (template) {
      const name = blockComponentName(type);
      files.push({ path: `src/components/${name}.tsx`, content: template(block) });
    }
  }

  // Workspace config JSON (for reference / re-import)
  files.push({
    path: 'workspace.json',
    content: JSON.stringify({
      version: 1,
      workspace: {
        name: workspace.name,
        template: workspace.template,
        blocks: workspace.blocks.map((b) => ({
          type: b.type, label: b.label, w: b.w, h: b.h,
          props: b.props, visible: b.visible,
        })),
        fallbackMode: workspace.fallbackMode,
      },
    }, null, 2),
  });

  return files;
}

// ─── Zip builder (no external deps — uses browser APIs) ───

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function toBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xFF, (n >> 8) & 0xFF]);
}

function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF]);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

export function buildZipBlob(files: GeneratedFile[], rootFolder: string): Blob {
  const entries: { header: Uint8Array; data: Uint8Array; name: Uint8Array; offset: number }[] = [];
  let offset = 0;

  for (const file of files) {
    const path = `${rootFolder}/${file.path}`;
    const name = toBytes(path);
    const data = toBytes(file.content);
    const crc = crc32(data);

    // Local file header
    const header = concatBytes(
      new Uint8Array([0x50, 0x4B, 0x03, 0x04]), // signature
      u16(20),    // version needed
      u16(0),     // flags
      u16(0),     // compression (store)
      u16(0),     // mod time
      u16(0),     // mod date
      u32(crc),
      u32(data.length), // compressed
      u32(data.length), // uncompressed
      u16(name.length),
      u16(0),     // extra length
      name,
    );

    entries.push({ header, data, name, offset });
    offset += header.length + data.length;
  }

  // Central directory
  const cdEntries: Uint8Array[] = [];
  for (const entry of entries) {
    const data = toBytes(files[entries.indexOf(entry)].content);
    const crc = crc32(data);
    cdEntries.push(concatBytes(
      new Uint8Array([0x50, 0x4B, 0x01, 0x02]),
      u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length),
      u16(entry.name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(entry.offset),
      entry.name,
    ));
  }

  const cd = concatBytes(...cdEntries);
  const eocd = concatBytes(
    new Uint8Array([0x50, 0x4B, 0x05, 0x06]),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(cd.length), u32(offset),
    u16(0),
  );

  const parts: Uint8Array[] = [];
  for (const entry of entries) {
    parts.push(entry.header, entry.data);
  }
  parts.push(cd, eocd);

  const final = concatBytes(...parts);
  return new Blob([final.buffer.slice(final.byteOffset, final.byteOffset + final.byteLength) as ArrayBuffer], { type: 'application/zip' });
}

// ─── Download trigger ───

export function downloadProject(opts: ProjectGenOptions): void {
  const files = generateProjectFiles(opts);
  const slug = opts.workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent-frontend';
  const blob = buildZipBlob(files, slug);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Get code as a single string (for clipboard / preview) ───

export function getProjectCodePreview(opts: ProjectGenOptions): string {
  const files = generateProjectFiles(opts);
  return files
    .filter((f) => f.path.startsWith('src/'))
    .map((f) => `// ─── ${f.path} ───\n${f.content}`)
    .join('\n\n');
}

// ─── Full project with agent backend code ───

export interface FullProjectGenOptions {
  workspace: WorkspaceConfig;
  agentCode: string;
  connection?: ConnectionProfile | null;
}

function detectAgentDeps(code: string): string[] {
  const deps: string[] = [];
  const patterns: [RegExp, string][] = [
    [/from\s+langchain/m, 'langchain'],
    [/from\s+langgraph/m, 'langgraph'],
    [/from\s+langchain_openai/m, 'langchain-openai'],
    [/from\s+langchain_anthropic/m, 'langchain-anthropic'],
    [/from\s+langchain_google/m, 'langchain-google-genai'],
    [/from\s+langchain_community/m, 'langchain-community'],
    [/from\s+langchain_core/m, 'langchain-core'],
    [/from\s+langsmith/m, 'langsmith'],
    [/from\s+copilotkit/m, 'copilotkit'],
    [/from\s+fastapi/m, 'fastapi'],
    [/import\s+uvicorn/m, 'uvicorn'],
    [/from\s+dotenv/m, 'python-dotenv'],
    [/from\s+pydantic/m, 'pydantic'],
    [/from\s+deepagents/m, 'deepagents'],
  ];
  for (const [re, dep] of patterns) {
    if (re.test(code)) deps.push(dep);
  }
  // Always include these for a working agent
  if (!deps.includes('copilotkit')) deps.push('copilotkit');
  if (!deps.includes('uvicorn')) deps.push('uvicorn');
  if (!deps.includes('fastapi')) deps.push('fastapi');
  if (!deps.includes('python-dotenv')) deps.push('python-dotenv');
  return [...new Set(deps)];
}

function genAgentRequirements(code: string): string {
  return detectAgentDeps(code).join('\n') + '\n';
}

function genAgentReadme(name: string): string {
  return `# ${name} — Agent Backend

This is the Python agent backend for your CopilotKit frontend.

## Setup

\`\`\`bash
cd agent
pip install -r requirements.txt
\`\`\`

## Run

\`\`\`bash
python agent_server.py
\`\`\`

The agent will start on http://localhost:8000. The frontend expects the CopilotKit endpoint at http://localhost:8000/copilotkit.

## Environment Variables

Create a \`.env\` file in this directory:

\`\`\`
OPENAI_API_KEY=your-key-here
\`\`\`
`;
}

function genFullReadme(name: string): string {
  return `# ${name}

Generated by CopilotKit Frontend Creator. This project includes both the React frontend and the Python agent backend.

## Quick Start

### 1. Start the Agent Backend

\`\`\`bash
cd agent
pip install -r requirements.txt
python agent_server.py
\`\`\`

### 2. Start the Frontend

\`\`\`bash
npm install
npm run dev
\`\`\`

The frontend connects to the agent at \`http://localhost:8000/copilotkit\` by default. You can change this in \`.env\`.

## Deploy

### Frontend
\`\`\`bash
npm run build
\`\`\`
Deploy the \`dist/\` folder to Vercel, Netlify, Cloudflare Pages, etc.

### Agent Backend
Deploy the \`agent/\` folder to any Python hosting (Railway, Render, Fly.io, etc).
`;
}

// ─── Docker & CI generators ───

function genDockerfile(_name: string): string {
  return `# Multi-stage build for frontend + agent backend

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Agent backend
FROM python:3.11-slim AS agent
WORKDIR /app/agent
COPY agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY agent/ .

# Stage 3: Production with nginx + agent
FROM python:3.11-slim
WORKDIR /app

# Install nginx
RUN apt-get update && apt-get install -y nginx && rm -rf /var/lib/apt/lists/*

# Copy frontend build
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Copy agent
COPY --from=agent /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY agent/ /app/agent/

# Nginx config
RUN echo 'server { \\
  listen 80; \\
  location / { root /usr/share/nginx/html; try_files $uri /index.html; } \\
  location /copilotkit { proxy_pass http://127.0.0.1:8000/copilotkit; } \\
  location /health { proxy_pass http://127.0.0.1:8000/health; } \\
}' > /etc/nginx/conf.d/default.conf

# Start script
RUN echo '#!/bin/sh\\nnginx\\ncd /app/agent && python agent_server.py' > /start.sh && chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
`;
}

function genDockerCompose(_name: string): string {
  return `version: "3.8"

services:
  frontend:
    build:
      context: .
      target: frontend-build
    command: npm run dev -- --host 0.0.0.0
    ports:
      - "5173:5173"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    environment:
      - VITE_RUNTIME_URL=http://localhost:8000/copilotkit

  agent:
    build:
      context: .
      target: agent
    command: python agent_server.py
    ports:
      - "8000:8000"
    volumes:
      - ./agent:/app/agent
    env_file:
      - ./agent/.env
`;
}

function genDockerIgnore(): string {
  return `node_modules
dist
.env
.env.local
agent/.env
__pycache__
*.pyc
.git
.DS_Store
`;
}

function genGitHubActions(): string {
  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build

  agent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r agent/requirements.txt
      - run: python -c "import agent.agent_server"
        env:
          OPENAI_API_KEY: test-key
`;
}

export function generateFullProjectFiles(opts: FullProjectGenOptions): GeneratedFile[] {
  const { workspace, agentCode, connection } = opts;
  // Get all frontend files
  const files = generateProjectFiles({ workspace, connection });

  // Replace README with full-project version
  const readmeIdx = files.findIndex((f) => f.path === 'README.md');
  if (readmeIdx >= 0) {
    files[readmeIdx] = { path: 'README.md', content: genFullReadme(workspace.name) };
  }

  // Add agent backend files
  files.push({ path: 'agent/agent_server.py', content: agentCode });
  files.push({ path: 'agent/requirements.txt', content: genAgentRequirements(agentCode) });
  files.push({ path: 'agent/README.md', content: genAgentReadme(workspace.name) });
  files.push({ path: 'agent/.env.example', content: '# Add your API keys here\nOPENAI_API_KEY=your-key-here\n# LangSmith (optional)\nLANGCHAIN_TRACING_V2=true\nLANGCHAIN_API_KEY=your-langsmith-key\nLANGCHAIN_PROJECT=your-project-name\n' });

  // Docker files for containerized deployment
  files.push({ path: 'Dockerfile', content: genDockerfile(workspace.name) });
  files.push({ path: 'docker-compose.yml', content: genDockerCompose(workspace.name) });
  files.push({ path: '.dockerignore', content: genDockerIgnore() });

  // GitHub Actions CI/CD
  files.push({ path: '.github/workflows/ci.yml', content: genGitHubActions() });

  return files;
}

export function downloadFullProject(opts: FullProjectGenOptions): void {
  const files = generateFullProjectFiles(opts);
  const slug = opts.workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent-frontend';
  const blob = buildZipBlob(files, slug);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
