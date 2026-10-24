import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkspace,applyAction} from '../lib/workspace.ts';
import {parseResult} from '../lib/agents/protocol.ts';
import {rpcEnvelope,runTool,tools} from '../lib/mcp/server.ts';
const result=()=>({summary:'A completed plan',deliverable:'# Plan\nA concrete outcome.',files:[],subtasks:[],questions:[]});
test('MCP discovery exports read, create, save, and review tools with strict schemas',()=>{
 assert.deepEqual(tools.map(t=>t.name),['get_workspace','get_task','create_task','save_agent_deliverable','resolve_inbox_request']);
 for(const tool of tools){assert.equal(tool.inputSchema.type,'object');assert.equal(tool.inputSchema.additionalProperties,false);}
 assert.match(tools.find(t=>t.name==='save_agent_deliverable').description,/Never claim code was applied, tested, committed, or deployed/);
});
test('JSON-RPC envelope rejects invalid messages and preserves request IDs',()=>{
 assert.deepEqual(rpcEnvelope({jsonrpc:'2.0',id:13,method:'tools/list'}),{id:13,method:'tools/list',params:{}});
 assert.deepEqual(rpcEnvelope({jsonrpc:'1.0',id:'x',method:'tools/list'}),{jsonrpc:'2.0',id:'x',error:{code:-32600,message:'Invalid JSON-RPC request.'}});
 assert.deepEqual(rpcEnvelope(null),{jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid JSON-RPC request.'}});
});
test('deliverable validation rejects unsafe paths, excessive content, and unsupported delegation',()=>{
 assert.deepEqual(parseResult(result(),'pm'),result());
 for(const path of ['../leak','/etc/passwd','.env','.env.production','nested/.git/config','./code.js','folder/../code.js'])assert.throws(()=>parseResult({...result(),files:[{path,language:'text',content:'x'}]},'eng'),/unsafe/);
 assert.throws(()=>parseResult({...result(),files:[{path:'a.ts',language:'ts',content:'x'.repeat(13000)},{path:'b.ts',language:'ts',content:'x'.repeat(13000)}]},'eng'),/size limit/);
 const subtasks=[{title:'Build login',description:'Accessible login form',agent:'eng',priority:'High'}];
 assert.throws(()=>parseResult({...result(),subtasks},'pm'),/Product Lead/);assert.equal(parseResult({...result(),subtasks},'lead').subtasks.length,1);
 assert.throws(()=>parseResult({...result(),subtasks:[{...subtasks[0],agent:'lead'}]},'lead'),/owner/);
});
test('MCP tools scope reads and writes to the authenticated identity supplied by the caller',async()=>{
 let workspace=initialWorkspace();const called=[];const deps={userId:'signed-in-user',getWorkspace:async(user)=>{called.push(user);return {workspace,revision:1};},createTask:async(user,action)=>{called.push(user);workspace=applyAction(workspace,action);return workspace;},getTask:async(user,id)=>{called.push(user);return {user,id};},saveDeliverable:async(user,taskId,runId,r)=>{called.push(user);return {user,taskId,runId,r};},resolveRequest:async(user,id,decision)=>{called.push(user);return {...workspace,inbox:[{id,decision}]};}};
 const summary=await runTool('get_workspace',{},deps);assert.equal(summary.tasks.length,4);assert.equal(called[0],'signed-in-user');
 const created=await runTool('create_task',{title:'Draft a welcome page',description:'Three short options',agent:'pm',priority:'Medium'},deps);assert.equal(created.tasks[0].title,'Draft a welcome page');assert.equal(called[1],'signed-in-user');
 const resultSaved=await runTool('save_agent_deliverable',{task_id:created.tasks[0].id,run_id:'123e4567-e89b-42d3-a456-426614174000',...result()},deps);assert.equal(resultSaved.user,'signed-in-user');assert.equal(resultSaved.taskId,created.tasks[0].id);assert.equal(called[2],'signed-in-user');
 const request=await runTool('resolve_inbox_request',{request_id:'review-id',decision:'Approved',reply:'Reviewed'},deps);assert.equal(request.request.decision,'Approved');assert.equal(called[3],'signed-in-user');
 await assert.rejects(()=>runTool('unknown_tool',{},deps),/Unknown tool/);
});
test('review rules retain linked decision protection and execution pause remains validated',()=>{
 let state=initialWorkspace();const task=state.tasks[0];task.latestRunId='new-run';state=applyAction(state,{type:'createRequest',kind:'Approval',title:'Old review',detail:''});state.inbox[0].runId='old-run';state.inbox[0].taskId=task.id;assert.throws(()=>applyAction(state,{type:'resolveRequest',id:state.inbox[0].id,status:'Approved',reply:''}),/older run/);
 state=applyAction(state,{type:'setExecutionPaused',paused:true});assert.equal(state.executionPaused,true);assert.throws(()=>applyAction(state,{type:'setExecutionPaused',paused:'false'}));
});
