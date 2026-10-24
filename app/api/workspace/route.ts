import {getChatGPTUser} from '../../chatgpt-auth';
import {getDb} from '@/db';
import {workspaces} from '@/db/schema';
import {and,eq} from 'drizzle-orm';
import {applyAction,initialWorkspace} from '@/lib/workspace';
import {authorizedBody,json,snapshot} from '@/lib/agents/api';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in to save your workspace.'},401);try{await getDb().insert(workspaces).values({userId:user.userId,state:JSON.stringify(initialWorkspace())}).onConflictDoNothing();return json(await snapshot(user.userId));}catch(e){console.error('Workspace read failed',e);return json({error:'The workspace could not be loaded. Please retry.'},500);}}
export async function POST(req:Request){const auth=await authorizedBody(req);if(auth.response)return auth.response;const {user,body}=auth;if(!Number.isInteger(body.revision)||!body.action||typeof body.action!=='object')return json({error:'Invalid request.'},400);
 try{const db=getDb();const [row]=await db.select().from(workspaces).where(eq(workspaces.userId,user.userId));if(!row)return json({error:'Load the workspace before making changes.'},409);if(row.revision!==body.revision)return json({error:'Your workspace changed. Refresh and try again.'},409);
 let workspace;try{workspace=applyAction(JSON.parse(row.state),body.action);}catch(e){return json({error:e instanceof Error?e.message:'Invalid action.'},400);}
 const updated=await db.update(workspaces).set({state:JSON.stringify(workspace),revision:row.revision+1}).where(and(eq(workspaces.userId,user.userId),eq(workspaces.revision,row.revision))).returning();if(!updated.length)return json({error:'Your workspace changed. Refresh and try again.'},409);
 return json(await snapshot(user.userId));
 }catch(e){console.error('Workspace write failed',e);return json({error:'Changes could not be saved. Please retry.'},500);}}
