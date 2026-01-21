CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reviewer_id` integer NOT NULL,
	`reviewee_id` integer NOT NULL,
	`team_id` integer,
	`rating` integer NOT NULL,
	`comment` text,
	`tags` text,
	`created_at` integer,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `teams` ADD `start_time` integer;--> statement-breakpoint
ALTER TABLE `teams` ADD `end_time` integer;