import {getChatGPTUser} from '@/app/chatgpt-auth';
import {json,snapshot} from '@/lib/agents/api';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in to view saved ChatGPT work.'},401);try{return json(await snapshot(user.userId));}catch{return json({error:'Could not load saved work.'},500);}}
export async function POST(){return json({error:'Agent work is completed in your ChatGPT conversation. Use the AI Product Office tools to save its deliverable.'},410);}
