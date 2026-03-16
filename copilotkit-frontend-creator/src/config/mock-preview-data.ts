// ─── Mock Preview Data ───
// Realistic placeholder data for live preview mode.
// Renders in preview when no agent is connected so users can see
// what their frontend will look like with real content.

import type { ChatMessage } from '@/hooks/useAgentChat';
import type { ToolCall, Approval, LogEntry } from '@/hooks/useAgentState';

export const MOCK_MESSAGES: ChatMessage[] = [
  { role: 'user', content: 'Analyze the Q4 sales data and find the top performing regions.', timestamp: '2025-03-16T10:00:00Z' },
  { role: 'assistant', content: 'I\'ll analyze the Q4 sales data now. Let me pull the regional breakdown and identify the top performers.', timestamp: '2025-03-16T10:00:02Z' },
  { role: 'user', content: 'Also compare it with Q3 numbers.', timestamp: '2025-03-16T10:01:00Z' },
  { role: 'assistant', content: 'Here\'s the comparison:\n\n• West region grew 23% QoQ\n• East region grew 18% QoQ\n• Central stayed flat at +2%\n\nWest region is the clear winner with $4.2M in Q4 revenue.', timestamp: '2025-03-16T10:01:05Z' },
];

export const MOCK_TOOL_CALLS: ToolCall[] = [
  { name: 'query_database', args: { query: 'SELECT region, SUM(revenue) FROM sales WHERE quarter=4 GROUP BY region' }, result: '3 rows returned', status: 'success', duration: '1.2s' },
  { name: 'calculate_growth', args: { q3: 3400000, q4: 4200000 }, result: { growth: '23.5%' }, status: 'success', duration: '0.3s' },
  { name: 'generate_chart', args: { type: 'bar', data: 'regional_comparison' }, status: 'running', duration: '' },
];

export const MOCK_APPROVALS: Approval[] = [
  { id: 'apr-1', title: 'Send report via email', description: 'Send the Q4 analysis report to the sales team distribution list (12 recipients).', status: 'pending' },
  { id: 'apr-2', title: 'Update dashboard', description: 'Push updated metrics to the shared analytics dashboard.', status: 'approved' },
];

export const MOCK_LOGS: LogEntry[] = [
  { level: 'info', message: 'Agent initialized — connected to runtime', timestamp: '10:00:00' },
  { level: 'info', message: 'Processing user query: "Analyze Q4 sales data"', timestamp: '10:00:01' },
  { level: 'debug', message: 'Tool call: query_database started', timestamp: '10:00:01' },
  { level: 'info', message: 'Database query returned 3 rows in 1.2s', timestamp: '10:00:02' },
  { level: 'debug', message: 'Tool call: calculate_growth started', timestamp: '10:00:03' },
  { level: 'info', message: 'Growth calculation complete', timestamp: '10:00:03' },
  { level: 'warn', message: 'Rate limit approaching: 45/50 requests this minute', timestamp: '10:00:04' },
  { level: 'info', message: 'Generating chart visualization', timestamp: '10:00:05' },
];

export const MOCK_RESULTS: unknown[] = [
  { region: 'West', q4_revenue: 4200000, q3_revenue: 3400000, growth: '23.5%' },
  { region: 'East', q4_revenue: 3100000, q3_revenue: 2630000, growth: '17.9%' },
  { region: 'Central', q4_revenue: 1800000, q3_revenue: 1760000, growth: '2.3%' },
];

export const MOCK_DASHBOARD_METRICS = [
  { label: 'Total Revenue', value: 9100000 },
  { label: 'Avg Growth', value: '14.6%' },
  { label: 'Top Region', value: 'West' },
  { label: 'Queries Run', value: 47 },
];
