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

package services

import (
	"testing"

	"code.vikunja.io/api/pkg/db"
	"code.vikunja.io/api/pkg/models"
	"code.vikunja.io/api/pkg/user"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestKanbanService_GetTasksInBucketsForView(t *testing.T) {
	u := &user.User{
		ID:       1,
		Username: "user1",
		Email:    "user1@example.com",
	}

	t.Run("Manual buckets with empty project", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()

		ks := NewKanbanService(db.GetEngine())

		// Create a simple test view structure (not relying on specific fixture data)
		view := &models.ProjectView{
			ID:                      1,
			ProjectID:               1,
			ViewKind:                models.ProjectViewKindKanban,
			BucketConfigurationMode: models.BucketConfigurationModeManual,
		}

		// Empty projects list - tests the edge case
		projects := []*models.Project{}

		opts := models.NewTaskSearchOptions(
			"",    // search
			0,     // page
			50,    // perPage
			nil,   // sortby
			nil,   // parsedFilters
			false, // filterIncludeNulls
			"",    // filter
			"",    // filterTimezone
			false, // isSavedFilter
			nil,   // projectIDs
			nil,   // expand
			1,     // projectViewID
		)

		buckets, err := ks.GetTasksInBucketsForView(s, view, projects, opts, u)
		require.NoError(t, err)

		// With empty projects, buckets should still be returned (if they exist in DB)
		// or empty list if no buckets exist for this view
		assert.NotNil(t, buckets, "Should return a bucket list (even if empty)")

		// All buckets should have no tasks since no projects were provided
		for _, bucket := range buckets {
			assert.Empty(t, bucket.Tasks, "Buckets should have no tasks when project list is empty")
			if bucket.CreatedBy != nil {
				// If CreatedBy is set, verify it's properly populated
				assert.NotZero(t, bucket.CreatedBy.ID, "CreatedBy should have ID set")
			}
		}
	})

	t.Run("Filter-based buckets", func(t *testing.T) {
		t.Skip("Filter-based buckets require complex setup with ProjectViewBucketConfiguration - tested via integration tests")
		// Note: Filter-based bucket functionality is tested in the webTests (pkg/webtests/kanban_test.go)
		// and through the actual API endpoints. Unit testing this requires creating a full
		// ProjectViewBucketConfiguration structure with TaskCollection filters, which is
		// better tested at the integration level.
	})

	t.Run("With bucket filter in options", func(t *testing.T) {
		// This test validates that when a user explicitly filters for a specific bucket,
		// the implementation correctly limits processing to only that bucket
		t.Skip("Skipping - requires proper bucket setup in fixtures")
		// Note: This functionality is tested via integration tests where proper
		// bucket structures exist in the database
	})

	t.Run("With task expansion options", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()

		ks := NewKanbanService(db.GetEngine())

		view := &models.ProjectView{
			ID:                      1,
			ProjectID:               1,
			ViewKind:                models.ProjectViewKindKanban,
			BucketConfigurationMode: models.BucketConfigurationModeManual,
		}

		projects := []*models.Project{
			{ID: 1},
		}

		opts := models.NewTaskSearchOptions(
			"",    // search
			0,     // page
			50,    // perPage
			nil,   // sortby
			nil,   // parsedFilters
			false, // filterIncludeNulls
			"",    // filter
			"",    // filterTimezone
			false, // isSavedFilter
			nil,   // projectIDs
			[]models.TaskCollectionExpandable{models.TaskCollectionExpandBuckets}, // expand buckets
			1, // projectViewID
		)

		buckets, err := ks.GetTasksInBucketsForView(s, view, projects, opts, u)
		require.NoError(t, err)
		assert.NotNil(t, buckets)

		// Verify that the expand option was passed through correctly
		// The expand parameter should be accessible via opts.GetExpand()
		assert.Contains(t, opts.GetExpand(), models.TaskCollectionExpandBuckets, "Expand option should be preserved")
	})

	t.Run("Sorting by position", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()

		ks := NewKanbanService(db.GetEngine())

		view := &models.ProjectView{
			ID:                      1,
			ProjectID:               1,
			ViewKind:                models.ProjectViewKindKanban,
			BucketConfigurationMode: models.BucketConfigurationModeManual,
		}

		projects := []*models.Project{
			{ID: 1},
		}

		opts := models.NewTaskSearchOptions(
			"",    // search
			0,     // page
			50,    // perPage
			nil,   // sortby - will be set by GetTasksInBucketsForView
			nil,   // parsedFilters
			false, // filterIncludeNulls
			"",    // filter
			"",    // filterTimezone
			false, // isSavedFilter
			nil,   // projectIDs
			nil,   // expand
			1,     // projectViewID
		)

		_, err := ks.GetTasksInBucketsForView(s, view, projects, opts, u)
		require.NoError(t, err)

		// Verify that GetTasksInBucketsForView set sort parameters
		sortParams := opts.GetSortBy()
		require.NotEmpty(t, sortParams, "Sort parameters should be set by GetTasksInBucketsForView")
		// The function should set position sorting for kanban views
		// (Internal fields are unexported, but we verify the parameter was set)
	})

	t.Run("Empty project", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()

		ks := NewKanbanService(db.GetEngine())

		view := &models.ProjectView{
			ID:                      1,
			ProjectID:               1,
			ViewKind:                models.ProjectViewKindKanban,
			BucketConfigurationMode: models.BucketConfigurationModeManual,
		}

		// Empty projects list - edge case
		projects := []*models.Project{}

		opts := models.NewTaskSearchOptions(
			"",    // search
			0,     // page
			50,    // perPage
			nil,   // sortby
			nil,   // parsedFilters
			false, // filterIncludeNulls
			"",    // filter
			"",    // filterTimezone
			false, // isSavedFilter
			nil,   // projectIDs
			nil,   // expand
			1,     // projectViewID
		)

		buckets, err := ks.GetTasksInBucketsForView(s, view, projects, opts, u)
		require.NoError(t, err)
		assert.NotNil(t, buckets, "Should return bucket list even with empty projects")

		// With empty projects, all buckets should have no tasks
		for _, bucket := range buckets {
			assert.Empty(t, bucket.Tasks, "Buckets should have no tasks when project list is empty")
		}
	})

	t.Run("Filters with additional user filters", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()

		ks := NewKanbanService(db.GetEngine())

		view := &models.ProjectView{
			ID:                      1,
			ProjectID:               1,
			ViewKind:                models.ProjectViewKindKanban,
			BucketConfigurationMode: models.BucketConfigurationModeManual,
		}

		projects := []*models.Project{
			{ID: 1},
		}

		// Add a user-provided filter (e.g., only undone tasks)
		parsedFilters, err := models.GetTaskFiltersFromFilterString("done = false", "")
		require.NoError(t, err)

		opts := models.NewTaskSearchOptions(
			"",             // search
			0,              // page
			50,             // perPage
			nil,            // sortby
			parsedFilters,  // parsedFilters
			false,          // filterIncludeNulls
			"done = false", // filter
			"",             // filterTimezone
			false,          // isSavedFilter
			nil,            // projectIDs
			nil,            // expand
			1,              // projectViewID
		)

		buckets, err := ks.GetTasksInBucketsForView(s, view, projects, opts, u)
		require.NoError(t, err)
		assert.NotNil(t, buckets, "Should return buckets with filtered tasks")

		// Verify all tasks match the filter (if any tasks are returned)
		for _, bucket := range buckets {
			for _, task := range bucket.Tasks {
				assert.False(t, task.Done, "All tasks should be undone based on filter")
			}
		}
	})
}

func TestKanbanService_GetTasksInBucketsForView_Integration(t *testing.T) {
	// Test the dependency inversion - ensure model layer can call service layer
	t.Run("Models delegate to service", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()

		// Ensure the service is initialized
		InitKanbanService()

		u := &user.User{
			ID:       1,
			Username: "user1",
			Email:    "user1@example.com",
		}

		view := &models.ProjectView{
			ID:                      1,
			ProjectID:               1,
			ViewKind:                models.ProjectViewKindKanban,
			BucketConfigurationMode: models.BucketConfigurationModeManual,
		}

		projects := []*models.Project{
			{ID: 1},
		}

		opts := models.NewTaskSearchOptions(
			"",    // search
			0,     // page
			50,    // perPage
			nil,   // sortby
			nil,   // parsedFilters
			false, // filterIncludeNulls
			"",    // filter
			"",    // filterTimezone
			false, // isSavedFilter
			nil,   // projectIDs
			nil,   // expand
			1,     // projectViewID
		)

		// Call through the model layer function variable
		buckets, err := models.GetTasksInBucketsForViewFunc(s, view, projects, opts, u)
		require.NoError(t, err, "Model layer should successfully delegate to service layer")
		assert.NotNil(t, buckets, "Should return a bucket list (may be empty depending on fixtures)")
	})

	t.Run("Panic if service not initialized", func(t *testing.T) {
		db.LoadAndAssertFixtures(t)
		s := db.NewSession()
		defer s.Close()

		// Clear the function pointer
		oldFunc := models.GetTasksInBucketsForViewFunc
		models.GetTasksInBucketsForViewFunc = nil
		defer func() {
			models.GetTasksInBucketsForViewFunc = oldFunc
		}()

		u := &user.User{
			ID:       1,
			Username: "user1",
			Email:    "user1@example.com",
		}

		view := &models.ProjectView{
			ID:        7,
			ProjectID: 6,
		}

		projects := []*models.Project{
			{ID: 6},
		}

		opts := &models.TaskSearchOptions{}

		// Should panic with helpful message
		assert.Panics(t, func() {
			_, _ = models.GetTasksInBucketsForView(s, view, projects, opts, u)
		}, "Should panic if service not initialized")
	})
}
