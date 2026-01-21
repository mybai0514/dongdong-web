PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`rank_requirement` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`contact_method` text NOT NULL,
	`contact_value` text NOT NULL,
	`creator_id` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`member_count` integer DEFAULT 1 NOT NULL,
	`max_members` integer DEFAULT 5 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_teams`("id", "game", "title", "description", "rank_requirement", "start_time", "end_time", "contact_method", "contact_value", "creator_id", "status", "member_count", "max_members", "created_at", "updated_at") SELECT "id", "game", "title", "description", "rank_requirement", "start_time", "end_time", "contact_method", "contact_value", "creator_id", "status", "member_count", "max_members", "created_at", "updated_at" FROM `teams`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
ALTER TABLE `__new_teams` RENAME TO `teams`;--> statement-breakpoint
PRAGMA foreign_keys=ON;