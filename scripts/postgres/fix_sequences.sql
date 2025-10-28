-- Fix PostgreSQL sequences to prevent duplicate key violations
-- This script synchronizes all sequences with the maximum ID in their respective tables

-- Fix all sequences
SELECT setval('api_tokens_id_seq', COALESCE((SELECT MAX(id) FROM api_tokens), 1), true);
SELECT setval('buckets_id_seq', COALESCE((SELECT MAX(id) FROM buckets), 1), true);
SELECT setval('labels_id_seq', COALESCE((SELECT MAX(id) FROM labels), 1), true);
SELECT setval('label_tasks_id_seq', COALESCE((SELECT MAX(id) FROM label_tasks), 1), true);
SELECT setval('link_shares_id_seq', COALESCE((SELECT MAX(id) FROM link_shares), 1), true);
SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 1), true);
SELECT setval('project_views_id_seq', COALESCE((SELECT MAX(id) FROM project_views), 1), true);
SELECT setval('reactions_id_seq', COALESCE((SELECT MAX(id) FROM reactions), 1), true);
SELECT setval('saved_filters_id_seq', COALESCE((SELECT MAX(id) FROM saved_filters), 1), true);
SELECT setval('subscriptions_id_seq', COALESCE((SELECT MAX(id) FROM subscriptions), 1), true);
SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 1), true);
SELECT setval('task_assignees_id_seq', COALESCE((SELECT MAX(id) FROM task_assignees), 1), true);
SELECT setval('task_attachments_id_seq', COALESCE((SELECT MAX(id) FROM task_attachments), 1), true);
SELECT setval('task_comments_id_seq', COALESCE((SELECT MAX(id) FROM task_comments), 1), true);
SELECT setval('task_relations_id_seq', COALESCE((SELECT MAX(id) FROM task_relations), 1), true);
SELECT setval('task_reminders_id_seq', COALESCE((SELECT MAX(id) FROM task_reminders), 1), true);
SELECT setval('teams_id_seq', COALESCE((SELECT MAX(id) FROM teams), 1), true);
SELECT setval('team_members_id_seq', COALESCE((SELECT MAX(id) FROM team_members), 1), true);
SELECT setval('team_projects_id_seq', COALESCE((SELECT MAX(id) FROM team_projects), 1), true);
SELECT setval('unsplash_photos_id_seq', COALESCE((SELECT MAX(id) FROM unsplash_photos), 1), true);
SELECT setval('users_projects_id_seq', COALESCE((SELECT MAX(id) FROM users_projects), 1), true);
SELECT setval('webhooks_id_seq', COALESCE((SELECT MAX(id) FROM webhooks), 1), true);

-- Verify the fixes (showing tables with data)
SELECT 'api_tokens' as table_name, 
       (SELECT MAX(id) FROM api_tokens) as max_id,
       (SELECT last_value FROM api_tokens_id_seq) as sequence_value
WHERE EXISTS (SELECT 1 FROM api_tokens)
UNION ALL
SELECT 'buckets',
       (SELECT MAX(id) FROM buckets),
       (SELECT last_value FROM buckets_id_seq)
WHERE EXISTS (SELECT 1 FROM buckets)
UNION ALL
SELECT 'labels',
       (SELECT MAX(id) FROM labels),
       (SELECT last_value FROM labels_id_seq)
WHERE EXISTS (SELECT 1 FROM labels)
UNION ALL
SELECT 'label_tasks',
       (SELECT MAX(id) FROM label_tasks),
       (SELECT last_value FROM label_tasks_id_seq)
WHERE EXISTS (SELECT 1 FROM label_tasks)
UNION ALL
SELECT 'link_shares',
       (SELECT MAX(id) FROM link_shares),
       (SELECT last_value FROM link_shares_id_seq)
WHERE EXISTS (SELECT 1 FROM link_shares)
UNION ALL
SELECT 'projects',
       (SELECT MAX(id) FROM projects),
       (SELECT last_value FROM projects_id_seq)
WHERE EXISTS (SELECT 1 FROM projects)
UNION ALL
SELECT 'project_views',
       (SELECT MAX(id) FROM project_views),
       (SELECT last_value FROM project_views_id_seq)
WHERE EXISTS (SELECT 1 FROM project_views)
UNION ALL
SELECT 'reactions',
       (SELECT MAX(id) FROM reactions),
       (SELECT last_value FROM reactions_id_seq)
WHERE EXISTS (SELECT 1 FROM reactions)
UNION ALL
SELECT 'saved_filters',
       (SELECT MAX(id) FROM saved_filters),
       (SELECT last_value FROM saved_filters_id_seq)
WHERE EXISTS (SELECT 1 FROM saved_filters)
UNION ALL
SELECT 'subscriptions',
       (SELECT MAX(id) FROM subscriptions),
       (SELECT last_value FROM subscriptions_id_seq)
WHERE EXISTS (SELECT 1 FROM subscriptions)
UNION ALL
SELECT 'tasks',
       (SELECT MAX(id) FROM tasks),
       (SELECT last_value FROM tasks_id_seq)
WHERE EXISTS (SELECT 1 FROM tasks)
UNION ALL
SELECT 'task_assignees',
       (SELECT MAX(id) FROM task_assignees),
       (SELECT last_value FROM task_assignees_id_seq)
WHERE EXISTS (SELECT 1 FROM task_assignees)
UNION ALL
SELECT 'task_attachments',
       (SELECT MAX(id) FROM task_attachments),
       (SELECT last_value FROM task_attachments_id_seq)
WHERE EXISTS (SELECT 1 FROM task_attachments)
UNION ALL
SELECT 'task_comments',
       (SELECT MAX(id) FROM task_comments),
       (SELECT last_value FROM task_comments_id_seq)
WHERE EXISTS (SELECT 1 FROM task_comments)
UNION ALL
SELECT 'task_relations',
       (SELECT MAX(id) FROM task_relations),
       (SELECT last_value FROM task_relations_id_seq)
WHERE EXISTS (SELECT 1 FROM task_relations)
UNION ALL
SELECT 'task_reminders',
       (SELECT MAX(id) FROM task_reminders),
       (SELECT last_value FROM task_reminders_id_seq)
WHERE EXISTS (SELECT 1 FROM task_reminders)
UNION ALL
SELECT 'teams',
       (SELECT MAX(id) FROM teams),
       (SELECT last_value FROM teams_id_seq)
WHERE EXISTS (SELECT 1 FROM teams)
UNION ALL
SELECT 'team_members',
       (SELECT MAX(id) FROM team_members),
       (SELECT last_value FROM team_members_id_seq)
WHERE EXISTS (SELECT 1 FROM team_members)
UNION ALL
SELECT 'team_projects',
       (SELECT MAX(id) FROM team_projects),
       (SELECT last_value FROM team_projects_id_seq)
WHERE EXISTS (SELECT 1 FROM team_projects)
UNION ALL
SELECT 'unsplash_photos',
       (SELECT MAX(id) FROM unsplash_photos),
       (SELECT last_value FROM unsplash_photos_id_seq)
WHERE EXISTS (SELECT 1 FROM unsplash_photos)
UNION ALL
SELECT 'users_projects',
       (SELECT MAX(id) FROM users_projects),
       (SELECT last_value FROM users_projects_id_seq)
WHERE EXISTS (SELECT 1 FROM users_projects)
UNION ALL
SELECT 'webhooks',
       (SELECT MAX(id) FROM webhooks),
       (SELECT last_value FROM webhooks_id_seq)
WHERE EXISTS (SELECT 1 FROM webhooks)
ORDER BY table_name;
