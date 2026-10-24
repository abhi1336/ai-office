import {and,desc,eq} from 'drizzle-orm';
import {getDb} from '@/db';
import {agentRuns,workspaces} from '@/db/schema';
import {applyAction,type Workspace} from '@/lib/workspace';
import {applyRunResult} from './lifecycle';
import {type AgentRun,type RunStatus,type RunnerConfig} from './types';
import {parseResult} from './protocol';

type Row=typeof agentRuns.$inferSelect;
export function publicRun(row:Row):AgentRun{return {id:row.id,taskId:row.taskId,title:row.title,agent:row.agent,status:row.status as RunStatus,model:row.model,result:row.result?JSON.parse(row.result):null,error:row.error,createdAt:row.createdAt,updatedAt:row.updatedAt,inputTokens:row.inputTokens,outputTokens:row.outputTokens};}
export async function readWorkspace(userId:string){const [row]=await getDb().select().from(workspaces).where(eq(workspaces.userId,userId));if(!row)throw new Error('Load the workspace before continuing.');return {workspace:JSON.parse(row.state) as Workspace,revision:row.revision};}
export async function changeWorkspace(userId:string,change:(w:Workspace)=>Workspace){for(let attempt=0;attempt<6;attempt++){const {workspace,revision}=await readWorkspace(userId);const next=change(workspace);const saved=await getDb().update(workspaces).set({state:JSON.stringify(next),revision:revision+1}).where(and(eq(workspaces.userId,userId),eq(workspaces.revision,revision))).returning();if(saved.length)return {workspace:next,revision:revision+1};}throw new Error('The workspace is busy. Refresh and try again.');}
export async function listRuns(userId:string){return getDb().select().from(agentRuns).where(eq(agentRuns.userId,userId)).orderBy(desc(agentRuns.createdAt)).limit(100);}
export async function configuration(userId:string):Promise<RunnerConfig>{const {workspace}=await readWorkspace(userId);return {configured:true,model:'Current ChatGPT model',dailyLimit:0,dailyUsed:0,maxConcurrent:0,activeCount:0,paused:!!workspace.executionPaused,maxOutputTokens:0};}
export async function ownRun(userId:string,id:string){const [run]=await getDb().select().from(agentRuns).where(and(eq(agentRuns.userId,userId),eq(agentRuns.id,id)));if(!run)throw new Error('Run not found.');return run;}
export async function syncRun(row:Row){if(row.synced||row.status!=='completed'||!row.result)return;
 await changeWorkspace(row.userId,w=>applyRunResult(w,publicRun(row)));
 await getDb().update(agentRuns).set({synced:1}).where(and(eq(agentRuns.id,row.id),eq(agentRuns.userId,row.userId)));
}

export async function saveAgentDeliverable(userId:string,taskId:string,runId:string,untrusted:unknown,model='Current ChatGPT model'){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId))throw new Error('run_id must be a new UUID so this save can be retried safely.');
 const {workspace}=await readWorkspace(userId);const task=workspace.tasks.find(t=>t.id===taskId);if(!task)throw new Error('Task not found.');const result=parseResult(untrusted,task.agent);
 const now=new Date().toISOString();const id=runId;
 const inserted=await getDb().insert(agentRuns).values({id,userId,taskId,title:task.title,agent:task.agent,status:'completed',model:model.slice(0,100),responseId:null,activeKey:null,result:JSON.stringify(result),error:null,createdAt:now,updatedAt:now,lastPolledAt:null,inputTokens:0,outputTokens:0,synced:0}).onConflictDoNothing().returning();
 let row=inserted[0];
 if(!row){row=await ownRun(userId,id);if(row.taskId!==taskId||row.result!==JSON.stringify(result))throw new Error('That run ID is already in use. Retry with the same content or use a new UUID.');}
 const prior=workspace.tasks.find(t=>t.id===taskId)?.latestRunId;
 let newerThanSaved=false;
 if(prior&&prior!==id){try{const latest=await ownRun(userId,prior);newerThanSaved=latest.createdAt>row.createdAt;}catch{}}
 if(!newerThanSaved){await changeWorkspace(userId,w=>{const t=w.tasks.find(t=>t.id===taskId);if(!t)throw new Error('Task not found.');if(t.latestRunId===id)return w;for(const r of w.inbox){if(r.taskId===t.id&&r.type==='Approval'&&r.status==='Pending'){r.status='Declined';r.reply='Superseded by a newer ChatGPT result.';}}t.latestRunId=id;t.status='In progress';return w;});await syncRun(row);}
 return {taskId,title:task.title,runId:id,status:newerThanSaved?'saved_as_older_run':'ready_for_review',summary:result.summary,reviewRequestId:`review:${id}`};
}

export async function reviewRequest(userId:string,requestId:string,decision:'Approved'|'Declined'|'Answered',reply=''){
 return changeWorkspace(userId,w=>applyAction(w,{type:'resolveRequest',id:requestId,status:decision,reply}));
}

export function ensureWorkspaceAction(workspace:Workspace,action:Record<string,unknown>){return applyAction(workspace,action);}
