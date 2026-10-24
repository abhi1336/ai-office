import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const workspaces=sqliteTable('workspaces', {userId:text('user_id').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull().default(0)});

export const agentRuns=sqliteTable('agent_runs',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),taskId:text('task_id').notNull(),title:text('title').notNull(),agent:text('agent').notNull(),
 status:text('status').notNull(),model:text('model').notNull(),responseId:text('response_id'),activeKey:text('active_key').unique(),
 result:text('result'),error:text('error'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),lastPolledAt:text('last_polled_at'),
 inputTokens:integer('input_tokens').notNull().default(0),outputTokens:integer('output_tokens').notNull().default(0),synced:integer('synced').notNull().default(0),
});
