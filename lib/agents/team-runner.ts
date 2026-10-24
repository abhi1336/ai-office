import {parseResult} from './protocol.ts';
import {buildSkillMessages,roleSkills,teamRunOrder,type TeamContribution,type TeamRole} from './skills.ts';
import type {AgentResult} from './types.ts';

export type TeamTask={title:string;description:string;owner:TeamRole};
export type TeamGenerator=(agent:TeamRole,messages:{system:string;user:string})=>Promise<unknown>;

export async function runTeamPipeline(task:TeamTask,generate:TeamGenerator,onRole:(index:number,agent:TeamRole)=>void=()=>{}):Promise<AgentResult>{
 const contributions:TeamContribution[]=[],questions:string[]=[];let files:AgentResult['files']=[];
 for(let index=0;index<teamRunOrder.length;index++){
  const agent=teamRunOrder[index];onRole(index,agent);
  const messages=buildSkillMessages(agent,task,contributions,agent==='qa'?files:[]);
  const parsed=parseResult(await generate(agent,messages),agent);
  if(parsed.subtasks.length)throw new Error(`${roleSkills[agent].role} proposed tasks the automatic handoff cannot safely create.`);
  if(agent==='eng'){
   files=parsed.files;
   if(files.reduce((size,file)=>size+file.content.length,0)>16000)throw new Error('The Software Engineer proposal is too large to save.');
  }
  contributions.push({agent,summary:parsed.summary.slice(0,500),deliverable:parsed.deliverable.slice(0,1600)});
  for(const question of parsed.questions){
   if(questions.length===3)break;
   if(!questions.some(existing=>existing.toLowerCase()===question.toLowerCase()))questions.push(question);
  }
 }
 const lead=contributions.find(stage=>stage.agent==='lead')!;
 const summary=`The full product team completed an eight-role pass. ${lead.summary}`.slice(0,1000);
 const highlights=contributions.map(stage=>`- **${roleSkills[stage.agent].role}:** ${stage.summary}`).join('\n');
 return parseResult({
  summary,
  deliverable:`# Team outcome\n\n${lead.deliverable}\n\n## Specialist handoffs\n\n${highlights}\n\n## Review boundary\n\nThe team produced proposals and checks. It did not change repository files, execute code, run tests, or deploy anything. Review the role contributions and proposed files before acting.`,
  files,subtasks:[],questions,team:contributions,
 },task.owner);
}
