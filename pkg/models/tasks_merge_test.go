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

package models

import (
	"testing"
	"time"

	"code.vikunja.io/api/pkg/user"
	"github.com/stretchr/testify/assert"
)

func TestTask_MergeFrom(t *testing.T) {
	t.Run("merge with maps present", func(t *testing.T) {
		// This test ensures MergeFrom works even when Task contains map fields
		// (which would cause "hash of unhashable type" errors with mergo v1.0+)

		existing := &Task{
			ID:          123,
			Title:       "Original Title",
			Description: "Original Description",
			Done:        false,
			Priority:    5,
			ProjectID:   10,
			// These map fields would cause mergo to fail
			Reactions: ReactionMap{
				"👍": []*user.User{{ID: 1, Username: "user1"}},
			},
			RelatedTasks: RelatedTaskMap{
				RelationKindSubtask: []*Task{{ID: 456, Title: "Subtask"}},
			},
			Comments: []*TaskComment{
				{ID: 789, Comment: "A comment", Reactions: ReactionMap{
					"👍": []*user.User{{ID: 1, Username: "user1"}},
				}},
			},
		}

		update := &Task{
			Title:       "Updated Title",
			Description: "Updated Description",
			Priority:    10,
			// These maps are also populated in the update
			Reactions: ReactionMap{
				"❤️": []*user.User{{ID: 2, Username: "user2"}},
			},
			RelatedTasks: RelatedTaskMap{
				RelationKindSubtask: []*Task{{ID: 999, Title: "Another Subtask"}},
			},
		}

		// This should NOT panic with "hash of unhashable type"
		existing.MergeFrom(update)

		// Verify the merge worked
		assert.Equal(t, "Updated Title", existing.Title)
		assert.Equal(t, "Updated Description", existing.Description)
		assert.Equal(t, int64(10), existing.Priority)
		assert.Equal(t, int64(10), existing.ProjectID) // Should not change (zero in update)
		assert.Equal(t, int64(123), existing.ID)       // Should never change

		// Map fields should remain as they were in existing
		// (MergeFrom doesn't touch these - they're managed separately)
		assert.Len(t, existing.Reactions, 1)
		assert.Contains(t, existing.Reactions, "👍")
	})

	t.Run("partial update semantics", func(t *testing.T) {
		existing := &Task{
			ID:          123,
			Title:       "Original Title",
			Description: "Original Description",
			Priority:    5,
			HexColor:    "FF0000",
		}

		update := &Task{
			Title: "Updated Title",
			// Description is empty - should not overwrite
			// Priority is 0 - should not overwrite
			HexColor: "00FF00",
		}

		existing.MergeFrom(update)

		assert.Equal(t, "Updated Title", existing.Title)
		assert.Equal(t, "Original Description", existing.Description) // Should not change
		assert.Equal(t, int64(5), existing.Priority)                  // Should not change
		assert.Equal(t, "00FF00", existing.HexColor)                  // Should change
	})

	t.Run("date fields merge correctly", func(t *testing.T) {
		now := time.Now()
		tomorrow := now.Add(24 * time.Hour)

		existing := &Task{
			ID:      123,
			DueDate: now,
			DoneAt:  time.Time{}, // Zero value
		}

		update := &Task{
			DueDate: tomorrow,
			DoneAt:  now, // Setting done at
		}

		existing.MergeFrom(update)

		assert.Equal(t, tomorrow, existing.DueDate)
		assert.Equal(t, now, existing.DoneAt)
	})
}
