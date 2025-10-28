-- Check if sequences are out of sync for all tables with auto-increment IDs
-- A positive 'difference' indicates the sequence is behind and will cause duplicate key errors

SELECT 'api_tokens' as table_name, 
       (SELECT MAX(id) FROM api_tokens) as max_id,
       (SELECT last_value FROM api_tokens_id_seq) as sequence_value,
       (SELECT MAX(id) FROM api_tokens) - (SELECT last_value FROM api_tokens_id_seq) as difference
UNION ALL
SELECT 'buckets',
       (SELECT MAX(id) FROM buckets),
       (SELECT last_value FROM buckets_id_seq),
       (SELECT MAX(id) FROM buckets) - (SELECT last_value FROM buckets_id_seq)
UNION ALL
SELECT 'labels',
       (SELECT MAX(id) FROM labels),
       (SELECT last_value FROM labels_id_seq),
       (SELECT MAX(id) FROM labels) - (SELECT last_value FROM labels_id_seq)
UNION ALL
SELECT 'label_tasks',
       (SELECT MAX(id) FROM label_tasks),
       (SELECT last_value FROM label_tasks_id_seq),
       (SELECT MAX(id) FROM label_tasks) - (SELECT last_value FROM label_tasks_id_seq)
UNION ALL
SELECT 'link_shares',
       (SELECT MAX(id) FROM link_shares),
       (SELECT last_value FROM link_shares_id_seq),
       (SELECT MAX(id) FROM link_shares) - (SELECT last_value FROM link_shares_id_seq)
UNION ALL
SELECT 'projects',
       (SELECT MAX(id) FROM projects),
       (SELECT last_value FROM projects_id_seq),
       (SELECT MAX(id) FROM projects) - (SELECT last_value FROM projects_id_seq)
UNION ALL
SELECT 'project_views',
       (SELECT MAX(id) FROM project_views),
       (SELECT last_value FROM project_views_id_seq),
       (SELECT MAX(id) FROM project_views) - (SELECT last_value FROM project_views_id_seq)
UNION ALL
SELECT 'reactions',
       (SELECT MAX(id) FROM reactions),
       (SELECT last_value FROM reactions_id_seq),
       (SELECT MAX(id) FROM reactions) - (SELECT last_value FROM reactions_id_seq)
UNION ALL
SELECT 'saved_filters',
       (SELECT MAX(id) FROM saved_filters),
       (SELECT last_value FROM saved_filters_id_seq),
       (SELECT MAX(id) FROM saved_filters) - (SELECT last_value FROM saved_filters_id_seq)
UNION ALL
SELECT 'subscriptions',
       (SELECT MAX(id) FROM subscriptions),
       (SELECT last_value FROM subscriptions_id_seq),
       (SELECT MAX(id) FROM subscriptions) - (SELECT last_value FROM subscriptions_id_seq)
UNION ALL
SELECT 'tasks',
       (SELECT MAX(id) FROM tasks),
       (SELECT last_value FROM tasks_id_seq),
       (SELECT MAX(id) FROM tasks) - (SELECT last_value FROM tasks_id_seq)
UNION ALL
SELECT 'task_assignees',
       (SELECT MAX(id) FROM task_assignees),
       (SELECT last_value FROM task_assignees_id_seq),
       (SELECT MAX(id) FROM task_assignees) - (SELECT last_value FROM task_assignees_id_seq)
UNION ALL
SELECT 'task_attachments',
       (SELECT MAX(id) FROM task_attachments),
       (SELECT last_value FROM task_attachments_id_seq),
       (SELECT MAX(id) FROM task_attachments) - (SELECT last_value FROM task_attachments_id_seq)
UNION ALL
SELECT 'task_comments',
       (SELECT MAX(id) FROM task_comments),
       (SELECT last_value FROM task_comments_id_seq),
       (SELECT MAX(id) FROM task_comments) - (SELECT last_value FROM task_comments_id_seq)
UNION ALL
SELECT 'task_relations',
       (SELECT MAX(id) FROM task_relations),
       (SELECT last_value FROM task_relations_id_seq),
       (SELECT MAX(id) FROM task_relations) - (SELECT last_value FROM task_relations_id_seq)
UNION ALL
SELECT 'task_reminders',
       (SELECT MAX(id) FROM task_reminders),
       (SELECT last_value FROM task_reminders_id_seq),
       (SELECT MAX(id) FROM task_reminders) - (SELECT last_value FROM task_reminders_id_seq)
UNION ALL
SELECT 'teams',
       (SELECT MAX(id) FROM teams),
       (SELECT last_value FROM teams_id_seq),
       (SELECT MAX(id) FROM teams) - (SELECT last_value FROM teams_id_seq)
UNION ALL
SELECT 'team_members',
       (SELECT MAX(id) FROM team_members),
       (SELECT last_value FROM team_members_id_seq),
       (SELECT MAX(id) FROM team_members) - (SELECT last_value FROM team_members_id_seq)
UNION ALL
SELECT 'team_projects',
       (SELECT MAX(id) FROM team_projects),
       (SELECT last_value FROM team_projects_id_seq),
       (SELECT MAX(id) FROM team_projects) - (SELECT last_value FROM team_projects_id_seq)
UNION ALL
SELECT 'unsplash_photos',
       (SELECT MAX(id) FROM unsplash_photos),
       (SELECT last_value FROM unsplash_photos_id_seq),
       (SELECT MAX(id) FROM unsplash_photos) - (SELECT last_value FROM unsplash_photos_id_seq)
UNION ALL
SELECT 'users_projects',
       (SELECT MAX(id) FROM users_projects),
       (SELECT last_value FROM users_projects_id_seq),
       (SELECT MAX(id) FROM users_projects) - (SELECT last_value FROM users_projects_id_seq)
UNION ALL
SELECT 'webhooks',
       (SELECT MAX(id) FROM webhooks),
       (SELECT last_value FROM webhooks_id_seq),
       (SELECT MAX(id) FROM webhooks) - (SELECT last_value FROM webhooks_id_seq)
ORDER BY difference DESC, table_name;
