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
    [/from\s+copilotkit/m, 'copilotkit'],
    [/from\s+fastapi/m, 'fastapi'],
    [/import\s+uvicorn/m, 'uvicorn'],
    [/from\s+dotenv/m, 'python-dotenv'],
    [/from\s+pydantic/m, 'pydantic'],
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
  files.push({ path: 'agent/.env.example', content: '# Add your API keys here\nOPENAI_API_KEY=your-key-here\n' });

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
