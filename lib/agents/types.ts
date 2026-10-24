export type RunStatus = 'starting' | 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'submission_unknown';
import type {TeamContribution} from './skills.ts';

export type AgentResult = {
  summary: string;
  deliverable: string;
  files: {path: string; language: string; content: string}[];
  subtasks: {title: string; description: string; agent: string; priority: 'High'|'Medium'|'Low'}[];
  questions: string[];
  team?: TeamContribution[];
};
export type AgentRun = {
  id: string; taskId: string; title: string; agent: string; status: RunStatus;
  model: string; result: AgentResult | null; error: string | null;
  createdAt: string; updatedAt: string; inputTokens: number; outputTokens: number;
};
export type RunnerConfig = {configured: boolean; model: string; dailyLimit: number; dailyUsed: number; maxConcurrent: number; activeCount: number; paused: boolean; maxOutputTokens: number};
export const activeStatuses: RunStatus[] = ['starting','queued','in_progress','submission_unknown'];
export const isActiveRun=(r:Pick<AgentRun,'status'>)=>activeStatuses.includes(r.status);
