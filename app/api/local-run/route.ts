import {getChatGPTUser} from '@/app/chatgpt-auth';
import {saveAgentDeliverable} from '@/lib/agents/store';
import {json,snapshot,authorizedBody} from '@/lib/agents/api';

export const dynamic='force-dynamic';

// Local Ollama output is still treated as untrusted: saveAgentDeliverable validates
// the result schema and generated file paths before it is stored for review.
export async function POST(req:Request){
 const auth=await authorizedBody(req);if(auth.response)return auth.response;
 const {user,body}=auth;
 if(typeof body.task_id!=='string'||typeof body.run_id!=='string'||typeof body.model!=='string'||! /^[a-zA-Z0-9._:-]{1,100}$/.test(body.model))return json({error:'Invalid local run request.'},400);
 try{
  const saved=await saveAgentDeliverable(user.userId,body.task_id,body.run_id,body.result,`Ollama · ${body.model}`);
  return json({...await snapshot(user.userId),saved});
 }catch(e){return json({error:e instanceof Error?e.message:'Could not save the Ollama result.'},400);}
}
