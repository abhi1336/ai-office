import {agents} from '../workspace.ts';
import type {AgentResult} from './types.ts';
import {roleSkills,teamRunOrder,type TeamRole} from './skills.ts';
function bounded(value:unknown,max:number,required=false):string{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new Error('The deliverable contains invalid or oversized content.');return value;}
export function parseResult(value:unknown,agent:string):AgentResult{
 if(!value||typeof value!=='object')throw new Error('The deliverable is invalid.');const r=value as Record<string,unknown>;
 if(!Array.isArray(r.files)||r.files.length>6||!Array.isArray(r.subtasks)||r.subtasks.length>6||!Array.isArray(r.questions)||r.questions.length>3)throw new Error('The deliverable has too many items.');
 const files=r.files.map(v=>{if(!v||typeof v!=='object')throw new Error('Invalid proposed file.');const f=v as Record<string,unknown>;const path=bounded(f.path,160,true);const parts=path.split('/');if(!/^[a-zA-Z0-9_.\/-]+$/.test(path)||path.startsWith('/')||parts.some(p=>p==='..'||p==='.'||/^\.env($|\.)/i.test(p)||p==='.git'))throw new Error('The deliverable contains an unsafe file path.');return {path,language:bounded(f.language,40),content:bounded(f.content,24000)};});
 if(files.reduce((n,f)=>n+f.content.length,0)>24000)throw new Error('The proposed files exceed the size limit.');
 const subtasks=r.subtasks.map(v=>{if(!v||typeof v!=='object')throw new Error('Invalid proposed task.');const t=v as Record<string,unknown>;if(!agents.some(a=>a.id===t.agent&&a.id!=='lead')||!['High','Medium','Low'].includes(String(t.priority)))throw new Error('Invalid proposed task owner or priority.');return {title:bounded(t.title,160,true),description:bounded(t.description,5000,true),agent:t.agent as string,priority:t.priority as 'High'|'Medium'|'Low'};});
 if(agent!=='lead'&&subtasks.length)throw new Error('Only the Product Lead can propose specialist tasks.');
 const result:AgentResult={summary:bounded(r.summary,1000,true),deliverable:bounded(r.deliverable,20000,true),files,subtasks,questions:r.questions.map(q=>bounded(q,1000,true))};
 if(r.team!==undefined){
  if(!Array.isArray(r.team)||r.team.length!==teamRunOrder.length)throw new Error('A full team report must include all eight role contributions.');
  const seen=new Set<string>();let total=0;
  result.team=r.team.map((value,index)=>{
   if(!value||typeof value!=='object')throw new Error('Invalid team contribution.');
   const item=value as Record<string,unknown>;
   if(typeof item.agent!=='string'||!Object.hasOwn(roleSkills,item.agent)||seen.has(item.agent)||item.agent!==teamRunOrder[index])throw new Error('Invalid, missing, or out-of-order team role.');
   seen.add(item.agent);const summary=bounded(item.summary,500,true);const deliverable=bounded(item.deliverable,1600,true);total+=summary.length+deliverable.length;
   if(total>14000)throw new Error('The team report exceeds the size limit.');
   return {agent:item.agent as TeamRole,summary,deliverable};
  });
 }
 return result;
}
