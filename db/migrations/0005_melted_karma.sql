CREATE TABLE `forum_dislikes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer,
	`comment_id` integer,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `forum_comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `forum_comments` ADD `dislikes_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `forum_posts` ADD `dislikes_count` integer DEFAULT 0 NOT NULL;