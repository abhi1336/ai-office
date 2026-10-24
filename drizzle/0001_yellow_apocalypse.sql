CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`title` text NOT NULL,
	`agent` text NOT NULL,
	`status` text NOT NULL,
	`model` text NOT NULL,
	`response_id` text,
	`active_key` text,
	`result` text,
	`error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_polled_at` text,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_runs_active_key_unique` ON `agent_runs` (`active_key`);