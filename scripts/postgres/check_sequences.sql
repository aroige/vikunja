-- Check if sequences are out of sync
SELECT 'projects' as table_name, 
       (SELECT MAX(id) FROM projects) as max_id,
       (SELECT last_value FROM projects_id_seq) as sequence_value,
       (SELECT MAX(id) FROM projects) - (SELECT last_value FROM projects_id_seq) as difference
UNION ALL
SELECT 'project_views' as table_name,
       (SELECT MAX(id) FROM project_views) as max_id,
       (SELECT last_value FROM project_views_id_seq) as sequence_value,
       (SELECT MAX(id) FROM project_views) - (SELECT last_value FROM project_views_id_seq) as difference
UNION ALL
SELECT 'saved_filters' as table_name,
       (SELECT MAX(id) FROM saved_filters) as max_id,
       (SELECT last_value FROM saved_filters_id_seq) as sequence_value,
       (SELECT MAX(id) FROM saved_filters) - (SELECT last_value FROM saved_filters_id_seq) as difference;
