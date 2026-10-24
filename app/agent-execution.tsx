'use client';
import {useRef,useState} from 'react';
import {Download,Copy,Check,FileCode2,History,ArrowRight,Workflow,ShieldCheck,Play,Loader2,Square} from 'lucide-react';
import {agents,type Task} from '@/lib/workspace';
import {roleSkills,teamRunOrder,type TeamRole} from '@/lib/agents/skills';
import {runTeamPipeline} from '@/lib/agents/team-runner';
import {type AgentResult,type AgentRun} from '@/lib/agents/types';

export function ResultText({text}:{text:string}){const parts=text.split(/(```[\s\S]*?```)/g);return <div className="result-markdown">{parts.map((part,i)=>part.startsWith('```')?<pre key={i}><code>{part.replace(/^```[^\n]*\n?/,'').replace(/```$/,'')}</code></pre>:<div key={i}>{part.split('\n').map((line,j)=>line.startsWith('### ')?<h4 key={j}>{line.slice(4)}</h4>:line.startsWith('## ')?<h3 key={j}>{line.slice(3)}</h3>:line.startsWith('# ')?<h3 key={j}>{line.slice(2)}</h3>:/^[-*] /.test(line)?<p className="result-bullet" key={j}>• {line.slice(2)}</p>:<p key={j}>{line||'\u00a0'}</p>)}</div>)}</div>;}
function download(name:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-zA-Z0-9._-]/g,'-');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

type PendingSave={runId:string;model:string;result:AgentResult};
export function TaskExecution({task,runs,onInbox,onSaved}:{task:Task;runs:AgentRun[];onInbox:()=>void;onSaved:()=>Promise<void>}){
 const history=runs.filter(r=>r.taskId===task.id),latest=history.find(r=>r.id===task.latestRunId)??history[0];const [feedback,setFeedback]=useState(''),[copied,setCopied]=useState(false),[oldId,setOldId]=useState('');const shown=history.find(r=>r.id===oldId)??latest;
 const [running,setRunning]=useState(false),[runError,setRunError]=useState(''),[activeIndex,setActiveIndex]=useState(-1),[pendingSave,setPendingSave]=useState(false);
 const controller=useRef<AbortController|null>(null),cancelRequested=useRef(false),pendingSaveRef=useRef<PendingSave|null>(null);

 async function saveCompletedTeam(){
  const pending=pendingSaveRef.current;if(!pending)throw new Error('The completed team report is unavailable. Run the team again.');
  const saved=await fetch('/api/local-run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task_id:task.id,run_id:pending.runId,model:pending.model,result:pending.result})});
  const json=await saved.json() as {error?:string};if(!saved.ok)throw new Error(json.error||'Could not save the team report.');
  pendingSaveRef.current=null;setPendingSave(false);await onSaved();
 }

 async function runFullTeam(){
  if(pendingSaveRef.current){setRunning(true);setRunError('');try{await saveCompletedTeam();}catch(e){setRunError(e instanceof Error?e.message:'The team report could not be saved.');}finally{setRunning(false);}return;}
  setRunning(true);setRunError('');setActiveIndex(0);cancelRequested.current=false;
  const model='qwen3.5:4b';const owner=(roleSkills as Partial<Record<string,unknown>>)[task.agent]?task.agent as TeamRole:'lead';
  try{
   const result=await runTeamPipeline({title:task.title,description:task.description,owner},async(agent,messages)=>{
    const skill=roleSkills[agent];
    const abort=new AbortController();controller.current=abort;const timer=setTimeout(()=>abort.abort(),240000);
    let response:Response;
    try{response=await fetch('http://localhost:11434/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({model,messages:[{role:'system',content:messages.system},{role:'user',content:messages.user}],stream:false,format:'json',options:{temperature:0.2,num_predict:1100}})});}catch(error){if(abort.signal.aborted&&!cancelRequested.current)throw new Error(`${skill.role} timed out after four minutes.`);throw error;}finally{clearTimeout(timer);controller.current=null;}
    if(!response.ok)throw new Error(`${skill.role} returned HTTP ${response.status}.`);
    const payload=await response.json() as {message?:{content?:string};error?:string};if(payload.error)throw new Error(`${skill.role}: ${payload.error}`);
    if(!payload.message?.content)throw new Error(`${skill.role} returned an empty answer.`);
    let untrusted:unknown;try{untrusted=JSON.parse(payload.message.content);}catch{throw new Error(`${skill.role} returned invalid JSON.`);}
    return untrusted;
   },(index)=>setActiveIndex(index));
   setActiveIndex(teamRunOrder.length);
   pendingSaveRef.current={runId:crypto.randomUUID(),model:`${model}-full-team`,result};setPendingSave(true);await saveCompletedTeam();
  }catch(e){
   const message=e instanceof Error?e.message:'The team could not complete this task.';
   if(cancelRequested.current)setRunError(`Canceled during ${activeIndex<teamRunOrder.length?roleSkills[teamRunOrder[Math.max(0,activeIndex)]].role:'save'}. Nothing was saved; starting again reruns the team.`);
   else if(pendingSaveRef.current)setRunError(`${message} The completed report is kept here; choose “Retry save” to save it without rerunning the model.`);
   else setRunError(`${activeIndex<teamRunOrder.length?roleSkills[teamRunOrder[Math.max(0,activeIndex)]].role+': ':''}${message}`);
  }finally{controller.current=null;setRunning(false);}
 }
 function cancelRun(){cancelRequested.current=true;controller.current?.abort();}

 return <section className="task-execution"><div className="execution-heading"><h3><Workflow size={17}/>Full product team</h3>{latest&&<span className="run-badge run-completed"><Check size={11}/>Saved for review</span>}</div>
 <div className="connection-needed"><ShieldCheck size={17}/><span>One start runs Product Lead, Product Manager, UX Architect, UI/UX Designer, AI Engineer, Software Engineer, QA Engineer, and DevOps Engineer in sequence. Each role receives earlier handoffs. The final report is saved to One Inbox for your review.</span></div>
 {running&&<div className="team-run-progress" role="status"><div className="team-run-progress-heading">{activeIndex<teamRunOrder.length?`Role ${activeIndex+1} of ${teamRunOrder.length}: ${roleSkills[teamRunOrder[Math.max(0,activeIndex)]].role}`:'Saving the completed team report…'}</div><progress max={teamRunOrder.length} value={Math.min(activeIndex,teamRunOrder.length)}/><ol>{teamRunOrder.map((agent,index)=><li className={index<activeIndex?'complete':index===activeIndex?'current':''} key={agent}>{roleSkills[agent].role}</li>)}</ol></div>}
 <div className="run-actions"><button className="btn primary" onClick={()=>void runFullTeam()} disabled={running}><>{running?<Loader2 size={15} className="spin"/>:<Play size={15}/>} {running?'Running the team…':pendingSave?'Retry save':'Run full team'}</></button>{running&&<button className="btn" onClick={cancelRun}><Square size={13}/>Cancel run</button>}</div>
 {runError&&<div className="error" role="alert">{runError}</div>}
 {!latest?.result&&<p className="muted">Ollama must be running on this PC with qwen3.5:4b installed. Keep this page open while the eight roles work; close the page only after the result appears.</p>}
 {history.length>1&&<label className="field-label">Saved results<select value={oldId||latest?.id||''} onChange={e=>setOldId(e.target.value)}>{history.map(r=><option key={r.id} value={r.id}>{new Date(r.createdAt).toLocaleString()} · {r.status}</option>)}</select></label>}
 {shown?.result&&<div className="deliverable"><div className="deliverable-title"><h3>Team deliverable</h3><div><button className="icon-btn" aria-label="Copy deliverable" onClick={async()=>{try{await navigator.clipboard.writeText(shown.result!.deliverable);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setCopied(false);}}}>{copied?<Check size={15}/>:<Copy size={15}/>}</button><button className="icon-btn" aria-label="Download deliverable" onClick={()=>download('team-deliverable.md',shown.result!.deliverable)}><Download size={15}/></button></div></div><p className="result-summary">{shown.result.summary}</p><ResultText text={shown.result.deliverable}/>
 {shown.result.team?.length&&<div className="team-contributions"><h4>Role skills and handoffs</h4>{shown.result.team.map((stage,index)=><details key={`${stage.agent}:${index}`}><summary><strong>{roleSkills[stage.agent].role}</strong><span>{roleSkills[stage.agent].objective}</span></summary><p className="result-summary">{stage.summary}</p><ResultText text={stage.deliverable}/></details>)}</div>}
 {shown.result.files.length>0&&<div className="generated-files"><h4>Proposed files</h4><p className="muted">Generated source only. Files have not been applied or executed.</p>{shown.result.files.map(f=><details key={f.path}><summary><FileCode2 size={15}/>{f.path}</summary><button className="btn" onClick={()=>download(f.path,f.content)}><Download size={12}/>Download file</button><pre><code>{f.content}</code></pre></details>)}</div>}
 {shown.result.subtasks.length>0&&<div className="delegation"><h4>Proposed specialist tasks</h4>{shown.result.subtasks.map((t,i)=><article key={i}><strong>{t.title}</strong><p>{t.description}</p><small>{agents.find(a=>a.id===t.agent)?.name} · {t.priority} priority</small></article>)}<p className="muted">Use ChatGPT to create approved specialist tasks when ready.</p></div>}
 {shown.result.questions.length>0&&<div className="agent-questions"><h4>Questions for you</h4>{shown.result.questions.map((q,i)=><p key={i}>{q}</p>)}</div>}
 <div className="result-meta">{shown.model} · saved {new Date(shown.updatedAt).toLocaleString()}</div>{shown.id===latest?.id&&task.status!=='Done'&&<button className="btn primary" onClick={onInbox}><ShieldCheck size={14}/>Review in One Inbox<ArrowRight size={13}/></button>}
 </div>}
 {latest&&<label className="field-label">Revision note for ChatGPT (optional)<textarea maxLength={3000} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What should change in the next version?"/></label>}
 {latest&&feedback.trim()&&<p className="muted">Copy this note into your ChatGPT request: {feedback}</p>}
 </section>;
}

export function RunsView({runs,onTask}:{runs:AgentRun[];onTask:(id:string)=>void}){return <section className="panel runs-panel"><div className="panel-heading"><div><h2><History size={17}/>Saved agent work</h2><p>Full-team deliverables from local Ollama or work saved from ChatGPT conversations.</p></div></div>{runs.length?runs.map(r=><button className="run-row" key={r.id} onClick={()=>onTask(r.taskId)}><span><strong>{r.title}</strong><small>{r.result?.team?.length?'Full product team':agents.find(a=>a.id===r.agent)?.name} · {r.model} · {new Date(r.createdAt).toLocaleString()}</small></span><span className="run-badge run-completed"><Check size={11}/>Ready for review</span><ArrowRight size={14}/></button>):<div className="empty"><Workflow size={30}/><h3>Run your first team task.</h3><p>Open a task and choose “Run full team” to generate role-by-role handoffs.</p></div>}</section>;}

export function RunnerSettings(){return <section className="panel integration-card"><div className="integration-title"><span className="integration-logo"><Workflow size={24}/></span><span className="status-pill">Local model</span></div><h2>Ollama runs the team workflow</h2><p>AI Product Office sends one task through eight role-specific skills using qwen3.5:4b. No OpenAI API key is needed, and the final report stays in this workspace.</p><div className="connection-needed"><ShieldCheck size={17}/><span>The full team handoff runs after one click while the page remains open. It is not an unattended background queue; you review the completed proposal in One Inbox.</span></div><p className="muted">Your browser connects to Ollama at localhost:11434. Keep Ollama bound to loopback and do not expose it to your network.</p><div className="result-meta">Local model · eight skills · human review</div></section>;}
