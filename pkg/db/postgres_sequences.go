// Vikunja is a to-do list application to facilitate your life.
// Copyright 2018-present Vikunja and contributors. All rights reserved.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

package db

import (
	"code.vikunja.io/api/pkg/config"
	"code.vikunja.io/api/pkg/log"
)

// SyncPostgreSQLSequences synchronizes all PostgreSQL sequences with their table's MAX(id).
// This prevents "duplicate key value violates unique constraint" errors that can occur
// after data imports, migrations, or restores where sequences weren't updated.
//
// This function is safe to call multiple times and on empty tables.
// It only runs when the database type is PostgreSQL.
func SyncPostgreSQLSequences() error {
	// Only run on PostgreSQL databases
	if config.DatabaseType.GetString() != "postgres" {
		return nil
	}

	log.Debugf("Synchronizing PostgreSQL sequences...")

	// List of all tables with auto-increment sequences
	tables := []string{
		"api_tokens",
		"buckets",
		"labels",
		"label_tasks",
		"link_shares",
		"projects",
		"project_views",
		"reactions",
		"saved_filters",
		"subscriptions",
		"tasks",
		"task_assignees",
		"task_attachments",
		"task_comments",
		"task_relations",
		"task_reminders",
		"teams",
		"team_members",
		"team_projects",
		"unsplash_photos",
		"users_projects",
		"webhooks",
	}

	engine := GetEngine()
	if engine == nil {
		return nil
	}

	session := engine.NewSession()
	defer session.Close()

	// Sync each sequence
	for _, table := range tables {
		sequenceName := table + "_id_seq"
		sql := `SELECT setval($1, COALESCE((SELECT MAX(id) FROM ` + table + `), 1), true)`

		_, err := session.Exec(sql, sequenceName)
		if err != nil {
			log.Warningf("Failed to sync sequence for table %s: %v", table, err)
			// Continue with other tables even if one fails
			continue
		}
	}

	log.Debugf("PostgreSQL sequence synchronization completed")
	return nil
}
