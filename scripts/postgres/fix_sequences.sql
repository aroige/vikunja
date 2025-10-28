-- Fix PostgreSQL sequences to prevent duplicate key violations
-- This script synchronizes all sequences with the maximum ID in their respective tables

-- Fix projects sequence
SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 1), true);

-- Fix project_views sequence
SELECT setval('project_views_id_seq', COALESCE((SELECT MAX(id) FROM project_views), 1), true);

-- Fix saved_filters sequence
SELECT setval('saved_filters_id_seq', COALESCE((SELECT MAX(id) FROM saved_filters), 1), true);

-- Fix buckets sequence (also used by project views)
SELECT setval('buckets_id_seq', COALESCE((SELECT MAX(id) FROM buckets), 1), true);

-- Verify the fixes
SELECT 'projects' as table_name, 
       (SELECT MAX(id) FROM projects) as max_id,
       (SELECT last_value FROM projects_id_seq) as sequence_value
UNION ALL
SELECT 'project_views',
       (SELECT MAX(id) FROM project_views),
       (SELECT last_value FROM project_views_id_seq)
UNION ALL
SELECT 'saved_filters',
       (SELECT MAX(id) FROM saved_filters),
       (SELECT last_value FROM saved_filters_id_seq)
UNION ALL
SELECT 'buckets',
       (SELECT MAX(id) FROM buckets),
       (SELECT last_value FROM buckets_id_seq);
