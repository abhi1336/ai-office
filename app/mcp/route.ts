import {getChatGPTUser} from '@/app/chatgpt-auth';
import {applyAction} from '@/lib/workspace';
import {changeWorkspace,ownRun,readWorkspace,reviewRequest,saveAgentDeliverable,syncRun} from '@/lib/agents/store';
import {rpcEnvelope,runTool,tools,type RpcResponse} from '@/lib/mcp/server';
export const dynamic='force-dynamic';
const reply=(body:RpcResponse,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function getTask(userId:string,taskId:string){const {workspace}=await readWorkspace(userId);const task=workspace.tasks.find(t=>t.id===taskId);if(!task)throw new Error('Task not found.');let latest=null;if(task.latestRunId){try{latest=await ownRun(userId,task.latestRunId);}catch{}}return {task,latestRun:latest?{id:latest.id,status:latest.status,model:latest.model,result:latest.result?JSON.parse(latest.result):null,error:latest.error}:null,requests:workspace.inbox.filter(r=>r.taskId===taskId)};}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return reply({jsonrpc:'2.0',id:null,error:{code:-32001,message:'Sign in to this private Site before using its project tools.'}},401);
 const type=req.headers.get('content-type')??'';if(!type.includes('application/json'))return reply({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Content-Type must be application/json.'}},415);
 let value:unknown;try{const raw=await req.text();if(raw.length>90000)throw new Error();value=JSON.parse(raw);}catch{return reply({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid or oversized JSON-RPC request.'}},400);}
 const envelope=rpcEnvelope(value);if(!('method' in envelope))return reply(envelope);
 const {id,method,params}=envelope;
 try{
  if(method==='server/discover')return reply({jsonrpc:'2.0',id,result:{supportedVersions:['2026-07-28'],capabilities:{tools:{}},serverInfo:{name:'ai-product-office',version:'0.3.0'}}});
  if(method==='tools/list')return reply({jsonrpc:'2.0',id,result:{tools}});
  if(method==='tools/call'){
   const name=params.name;if(typeof name!=='string')return reply({jsonrpc:'2.0',id,result:{content:[{type:'text',text:'Tool name is required.'}],isError:true}});
   const args=params.arguments&&typeof params.arguments==='object'&&!Array.isArray(params.arguments)?params.arguments as Record<string,unknown>:{};
   try{const output=await runTool(name,args,{userId:user.userId,getWorkspace:readWorkspace,createTask:async(userId,action)=>(await changeWorkspace(userId,w=>applyAction(w,action))).workspace,getTask,saveDeliverable:saveAgentDeliverable,resolveRequest:async(userId,requestId,decision,reply)=> (await reviewRequest(userId,requestId,decision,reply)).workspace});return reply({jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(output)}]}});}
   catch(e){return reply({jsonrpc:'2.0',id,result:{content:[{type:'text',text:e instanceof Error?e.message:'Tool call failed.'}],isError:true}});}
  }
  return reply({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found.'}});
 }catch{return reply({jsonrpc:'2.0',id,error:{code:-32603,message:'The project tool could not complete the request.'}},500);}
}
