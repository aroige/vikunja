# PostgreSQL Maintenance Scripts

This directory contains PostgreSQL-specific maintenance scripts for Vikunja.

## Automatic Sequence Synchronization

**Starting from this version, Vikunja automatically synchronizes PostgreSQL sequences on startup!**

The sequence synchronization happens automatically during initialization when using PostgreSQL. This prevents "duplicate key value violates unique constraint" errors that commonly occur after:
- Data migrations from SQLite
- Database restores
- Data imports with explicit IDs

The automatic sync is logged at DEBUG level and runs safely on every startup. No manual intervention is needed in normal operation.

## Manual Scripts

The manual scripts in this directory are provided for:
- Troubleshooting sequence issues
- Running sync operations without restarting Vikunja
- Verifying sequence states after data operations

## Scripts

### check_sequences.sql

Diagnostic script to check if PostgreSQL sequences are out of sync with table data.

**Usage:**
```bash
psql -h localhost -U vikunja -d vikunja_db -f scripts/postgres/check_sequences.sql
```

**What it checks:**
- All 22 tables with auto-increment sequences:
  - `api_tokens`, `buckets`, `labels`, `label_tasks`, `link_shares`
  - `projects`, `project_views`, `reactions`, `saved_filters`, `subscriptions`
  - `tasks`, `task_assignees`, `task_attachments`, `task_comments`
  - `task_relations`, `task_reminders`, `teams`, `team_members`, `team_projects`
  - `unsplash_photos`, `users_projects`, `webhooks`

**Output interpretation:**
- `difference` > 0: Sequence is behind (PROBLEM - will cause duplicate key errors)
- `difference` = 0: Sequence is in sync (OK)
- `difference` < 0: Sequence is ahead (OK - normal after deletes)

### fix_sequences.sql

Fixes out-of-sync sequences by setting them to the maximum ID in each table.

**Usage:**
```bash
psql -h localhost -U vikunja -d vikunja_db -f scripts/postgres/fix_sequences.sql
```

**What it fixes:**
- Synchronizes all 22 auto-increment sequences with their table's MAX(id)
- Prevents "duplicate key value violates unique constraint" errors on any table
- Includes verification output showing synchronized values for non-empty tables

## When to use these scripts

### Symptoms of out-of-sync sequences:
- Error: `pq: duplicate key value violates unique constraint "<table>_pkey"`
- Error: `pq: duplicate key value violates unique constraint "<table>_id_seq"`
- 500 errors when creating any entity (projects, tasks, labels, teams, etc.)

### Common causes:
1. **Data migration from SQLite**: SQLite doesn't use sequences, so they need manual sync
2. **Database restore**: Restoring from backup may not restore sequence values
3. **Manual data import**: Inserting rows with explicit IDs doesn't update sequences
4. **pg_dump/pg_restore**: May not always preserve sequence states correctly

### Prevention:
After any data import or migration, always run `fix_sequences.sql` to prevent issues.

## Example workflow

1. **After migrating from SQLite:**
   ```bash
   # Check if sequences need fixing
   psql -h localhost -U vikunja -d vikunja_db -f scripts/postgres/check_sequences.sql
   
   # If any 'difference' values are positive, run the fix
   psql -h localhost -U vikunja -d vikunja_db -f scripts/postgres/fix_sequences.sql
   ```

2. **Regular maintenance:**
   ```bash
   # Run check periodically to catch issues early
   psql -h localhost -U vikunja -d vikunja_db -f scripts/postgres/check_sequences.sql
   ```

## Technical details

PostgreSQL sequences are separate database objects that generate auto-increment values. Unlike SQLite's AUTOINCREMENT, they can get out of sync with table data when:

- Rows are inserted with explicit IDs
- Data is restored from dumps
- Database is migrated from another system

The `setval()` function updates the sequence to ensure the next generated ID will be higher than any existing ID in the table.
