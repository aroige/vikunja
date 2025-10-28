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

package webtests

import (
	"os"
	"testing"

	"code.vikunja.io/api/pkg/models"
	"code.vikunja.io/api/pkg/web/handler"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestTaskUpdateWithMapFields_PostgreSQL tests the specific issue with PostgreSQL
// where updating a task with map fields causes "hash of unhashable type" panic
//
// To run this test with PostgreSQL:
// export VIKUNJA_TESTS_USE_CONFIG=1
// export VIKUNJA_SERVICE_ROOTPATH=$(pwd)
// go test -v ./pkg/webtests -run TestTaskUpdateWithMapFields_PostgreSQL
func TestTaskUpdateWithMapFields_PostgreSQL(t *testing.T) {
	// Check if we're using the config (which would use PostgreSQL if configured)
	if os.Getenv("VIKUNJA_TESTS_USE_CONFIG") != "1" {
		t.Skip("Skipping PostgreSQL-specific test. Set VIKUNJA_TESTS_USE_CONFIG=1 to run with PostgreSQL")
	}

	testHandler := webHandlerTest{
		user: &testuser1,
		strFunc: func() handler.CObject {
			return &models.Task{}
		},
		t: t,
	}

	t.Run("Update task with empty map fields from frontend (PostgreSQL)", func(t *testing.T) {
		// This simulates the frontend sending a task update that includes the map fields
		// (reactions, related_tasks, comments) which are typically present in GET responses
		// and get sent back with the POST/PUT request
		payload := `{
			"title": "Updated Title PostgreSQL Test",
			"description": "Updated Description",
			"reactions": {},
			"related_tasks": {},
			"comments": [],
			"assignees": [],
			"labels": [],
			"attachments": []
		}`

		rec, err := testHandler.testUpdateWithUser(nil, map[string]string{"projecttask": "1"}, payload)
		require.NoError(t, err, "Should not panic with 'hash of unhashable type' error on PostgreSQL")
		assert.Equal(t, 200, rec.Code, "Should successfully update task")
		assert.Contains(t, rec.Body.String(), `"title":"Updated Title PostgreSQL Test"`)
	})

	t.Run("Update task with populated reactions map (PostgreSQL)", func(t *testing.T) {
		// This simulates the case where the frontend has fetched a task with reactions
		// and then tries to update it, sending the reactions data back
		payload := `{
			"title": "Another PostgreSQL Update",
			"reactions": {
				"👍": [{"id": 1, "username": "user1"}]
			},
			"related_tasks": {
				"subtask": [{"id": 2, "title": "Related task"}]
			},
			"comments": [
				{
					"id": 1,
					"comment": "A comment",
					"reactions": {
						"❤️": [{"id": 2, "username": "user2"}]
					}
				}
			]
		}`

		rec, err := testHandler.testUpdateWithUser(nil, map[string]string{"projecttask": "1"}, payload)
		require.NoError(t, err, "Should handle populated map fields without panicking on PostgreSQL")
		assert.Equal(t, 200, rec.Code, "Should successfully update task")
		assert.Contains(t, rec.Body.String(), `"title":"Another PostgreSQL Update"`)
	})
}

func TestTaskUpdateWithMapFields(t *testing.T) {
	testHandler := webHandlerTest{
		user: &testuser1,
		strFunc: func() handler.CObject {
			return &models.Task{}
		},
		t: t,
	}

	t.Run("Update task with empty map fields from frontend", func(t *testing.T) {
		// This simulates the frontend sending a task update that includes the map fields
		// (reactions, related_tasks, comments) which are typically present in GET responses
		// and get sent back with the POST/PUT request
		payload := `{
			"title": "Updated Title",
			"description": "Updated Description",
			"reactions": {},
			"related_tasks": {},
			"comments": [],
			"assignees": [],
			"labels": [],
			"attachments": []
		}`

		rec, err := testHandler.testUpdateWithUser(nil, map[string]string{"projecttask": "1"}, payload)
		require.NoError(t, err, "Should not panic with 'hash of unhashable type'")
		assert.Equal(t, 200, rec.Code, "Should successfully update task")
		assert.Contains(t, rec.Body.String(), `"title":"Updated Title"`)
	})

	t.Run("Update task with populated reactions map", func(t *testing.T) {
		// This simulates the case where the frontend has fetched a task with reactions
		// and then tries to update it, sending the reactions data back
		payload := `{
			"title": "Another Update",
			"reactions": {
				"👍": [{"id": 1, "username": "user1"}]
			},
			"related_tasks": {
				"subtask": [{"id": 2, "title": "Related task"}]
			}
		}`

		rec, err := testHandler.testUpdateWithUser(nil, map[string]string{"projecttask": "1"}, payload)
		require.NoError(t, err, "Should handle populated map fields without panicking")
		assert.Equal(t, 200, rec.Code, "Should successfully update task")
		assert.Contains(t, rec.Body.String(), `"title":"Another Update"`)
	})
}
