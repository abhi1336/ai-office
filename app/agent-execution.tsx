'use client';
import {useState} from 'react';
import {Download,Copy,Check,FileCode2,History,ArrowRight,Workflow,ShieldCheck,Play,Loader2} from 'lucide-react';
import {agents,type Task} from '@/lib/workspace';
import {type AgentRun,type RunnerConfig} from '@/lib/agents/types';
export function ResultText({text}:{text:string}){const parts=text.split(/(```[\s\S]*?```)/g);return <div className="result-markdown">{parts.map((part,i)=>part.startsWith('```')?<pre key={i}><code>{part.replace(/^```[^\n]*\n?/,'').replace(/```$/,'')}</code></pre>:<div key={i}>{part.split('\n').map((line,j)=>line.startsWith('### ')?<h4 key={j}>{line.slice(4)}</h4>:line.startsWith('## ')?<h3 key={j}>{line.slice(3)}</h3>:line.startsWith('# ')?<h3 key={j}>{line.slice(2)}</h3>:/^[-*] /.test(line)?<p className="result-bullet" key={j}>• {line.slice(2)}</p>:<p key={j}>{line||'\u00a0'}</p>)}</div>)}</div>;}
function download(name:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-zA-Z0-9._-]/g,'-');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function TaskExecution({task,runs,onInbox,onSaved}:{task:Task;runs:AgentRun[];onInbox:()=>void;onSaved:()=>Promise<void>}){
 const history=runs.filter(r=>r.taskId===task.id),latest=history.find(r=>r.id===task.latestRunId)??history[0];const [feedback,setFeedback]=useState(''),[copied,setCopied]=useState(false),[oldId,setOldId]=useState('');const shown=history.find(r=>r.id===oldId)??latest;
 const [running,setRunning]=useState(false),[runError,setRunError]=useState('');
 async function runWithOllama(){
  setRunning(true);setRunError('');
  try{
   const model='qwen3.5:4b';
   const role=agents.find(a=>a.id===task.agent);
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),240000);
   let response:Response;
   try{response=await fetch('http://localhost:11434/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({model,messages:[{role:'system',content:`You are ${role?.name??'an AI teammate'}, serving as ${role?.role??'a product team specialist'}. ${role?.mission??''} Complete the assigned task carefully. Do not claim to have changed files, run commands, or taken external actions. Return only valid JSON with exactly these keys: summary (short string), deliverable (complete Markdown string), files (array of {path,language,content}; use [] unless source files were explicitly requested), subtasks (array of {title,description,agent,priority}; use [] unless you are the Product Lead and specialist work is clearly needed), questions (array of short strings; use [] unless blocked).`},{role:'user',content:`Task: ${task.title}\n\nDescription and acceptance criteria:\n${task.description||'Use the title as the request.'}`}],stream:false,format:'json',options:{temperature:0.3}})});}finally{clearTimeout(timer);}
   if(!response.ok)throw new Error(`Ollama returned HTTP ${response.status}.`);
   const payload=await response.json() as {message?:{content?:string};error?:string};
   if(payload.error)throw new Error(payload.error);
   if(!payload.message?.content)throw new Error('Ollama returned an empty answer.');
   let result:unknown;try{result=JSON.parse(payload.message.content);}catch{throw new Error('The model response was not valid JSON. Try running the task again.');}
   const saved=await fetch('/api/local-run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task_id:task.id,run_id:crypto.randomUUID(),model,result})});
   const savedJson=await saved.json() as {error?:string};if(!saved.ok)throw new Error(savedJson.error||'Could not save the result.');
   await onSaved();
  }catch(e){const message=e instanceof Error?e.message:'';setRunError(message.includes('Failed to fetch')?'Could not reach Ollama. Make sure Ollama is running on this PC, then try again.':message.includes('aborted')?'Ollama took too long. Try again with a shorter task.':message||'The task could not be completed.');}
  finally{setRunning(false);}
 }
 return <section className="task-execution"><div className="execution-heading"><h3><Workflow size={17}/>Local Ollama work</h3>{latest&&<span className="run-badge run-completed"><Check size={11}/>Saved for review</span>}</div>
 <div className="connection-needed"><ShieldCheck size={17}/><span>Run this task with qwen3.5:4b on your PC. The result is saved to this workspace and appears in One Inbox for your review.</span></div>
 <button className="btn primary" onClick={()=>void runWithOllama()} disabled={running}><>{running?<Loader2 size={15} className="spin"/>:<Play size={15}/>} {running?'Working locally…':'Run with Ollama'}</></button>
 {runError&&<div className="error" role="alert">{runError}</div>}
 {!latest?.result&&<p className="muted">Keep this page open while Ollama generates the result. You can also ask ChatGPT to work on the same task.</p>}
 {history.length>1&&<label className="field-label">Saved results<select value={oldId||latest?.id||''} onChange={e=>setOldId(e.target.value)}>{history.map(r=><option key={r.id} value={r.id}>{new Date(r.createdAt).toLocaleString()} · {r.status}</option>)}</select></label>}
 {shown?.result&&<div className="deliverable"><div className="deliverable-title"><h3>Deliverable</h3><div><button className="icon-btn" aria-label="Copy deliverable" onClick={async()=>{try{await navigator.clipboard.writeText(shown.result!.deliverable);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setCopied(false);}}}>{copied?<Check size={15}/>:<Copy size={15}/>}</button><button className="icon-btn" aria-label="Download deliverable" onClick={()=>download('deliverable.md',shown.result!.deliverable)}><Download size={15}/></button></div></div><p className="result-summary">{shown.result.summary}</p><ResultText text={shown.result.deliverable}/>
 {shown.result.files.length>0&&<div className="generated-files"><h4>Proposed files</h4><p className="muted">Generated source only. Files have not been applied or executed.</p>{shown.result.files.map(f=><details key={f.path}><summary><FileCode2 size={15}/>{f.path}</summary><button className="btn" onClick={()=>download(f.path,f.content)}><Download size={12}/>Download file</button><pre><code>{f.content}</code></pre></details>)}</div>}
 {shown.result.subtasks.length>0&&<div className="delegation"><h4>Proposed specialist tasks</h4>{shown.result.subtasks.map((t,i)=><article key={i}><strong>{t.title}</strong><p>{t.description}</p><small>{agents.find(a=>a.id===t.agent)?.name} · {t.priority} priority</small></article>)}<p className="muted">Use ChatGPT to create approved specialist tasks when ready.</p></div>}
 {shown.result.questions.length>0&&<div className="agent-questions"><h4>Questions for you</h4>{shown.result.questions.map((q,i)=><p key={i}>{q}</p>)}</div>}
 <div className="result-meta">{shown.model} · saved {new Date(shown.updatedAt).toLocaleString()}</div>{shown.id===latest?.id&&task.status!=='Done'&&<button className="btn primary" onClick={onInbox}><ShieldCheck size={14}/>Review in One Inbox<ArrowRight size={13}/></button>}
 </div>}
 {latest&&<label className="field-label">Revision note for ChatGPT (optional)<textarea maxLength={3000} value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="What should change in the next version?"/></label>}
 {latest&&feedback.trim()&&<p className="muted">Copy this note into your ChatGPT request: {feedback}</p>}
 </section>;
}
export function RunsView({runs,onTask}:{runs:AgentRun[];onTask:(id:string)=>void}){return <section className="panel runs-panel"><div className="panel-heading"><div><h2><History size={17}/>Saved agent work</h2><p>Deliverables completed by local Ollama or saved from ChatGPT conversations.</p></div></div>{runs.length?runs.map(r=><button className="run-row" key={r.id} onClick={()=>onTask(r.taskId)}><span><strong>{r.title}</strong><small>{agents.find(a=>a.id===r.agent)?.name} · {r.model} · {new Date(r.createdAt).toLocaleString()}</small></span><span className="run-badge run-completed"><Check size={11}/>Ready for review</span><ArrowRight size={14}/></button>):<div className="empty"><Workflow size={30}/><h3>Run your first task with Ollama.</h3><p>Open a task and choose “Run with Ollama” to generate a deliverable on your PC.</p></div>}</section>;}
export function RunnerSettings(){return <section className="panel integration-card"><div className="integration-title"><span className="integration-logo"><Workflow size={24}/></span><span className="status-pill">Local model</span></div><h2>Ollama is your local AI provider</h2><p>AI Product Office sends task prompts to qwen3.5:4b running on this PC. No OpenAI API key is needed, and task results stay in this workspace.</p><div className="connection-needed"><ShieldCheck size={17}/><span>Keep Ollama running, open a task, and select “Run with Ollama.” The first version runs when you start it and returns the result for your review; it does not yet run unattended in the background.</span></div><p className="muted">Your browser connects to Ollama at localhost:11434. Do not expose Ollama to your network.</p><div className="result-meta">Local model · human review in One Inbox</div></section>;}
