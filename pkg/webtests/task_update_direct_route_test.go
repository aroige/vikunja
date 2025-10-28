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
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"code.vikunja.io/api/pkg/modules/auth"
	"code.vikunja.io/api/pkg/user"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Helper function to generate JWT token for testing
func getJWTTokenForTestUser(t *testing.T, user *user.User) string {
	token, err := auth.NewUserJWTAuthtoken(user, false)
	require.NoError(t, err)
	return token
}

// TestTaskUpdate_DirectRoute tests the actual POST /api/v1/tasks/:taskid endpoint
// This reproduces the exact scenario that happens in the frontend
func TestTaskUpdate_DirectRoute(t *testing.T) {
	e, err := setupTestEnv()
	require.NoError(t, err)

	// Get a valid JWT token for testuser1
	token := getJWTTokenForTestUser(t, &testuser1)

	t.Run("POST to /api/v1/tasks/1 with simple update", func(t *testing.T) {
		payload := `{"title":"Updated via direct route"}`

		req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/1", strings.NewReader(payload))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		req.Header.Set("Authorization", "Bearer "+token)

		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)

		t.Logf("Response status: %d", rec.Code)
		t.Logf("Response body: %s", rec.Body.String())

		assert.Equal(t, http.StatusOK, rec.Code, "Should successfully update task. Body: %s", rec.Body.String())
		if rec.Code == http.StatusOK {
			assert.Contains(t, rec.Body.String(), `"title":"Updated via direct route"`)
		}
	})

	t.Run("POST to /api/v1/tasks/1 with map fields in payload", func(t *testing.T) {
		// This is what the frontend actually sends - a task object that includes
		// reactions, comments, related_tasks from the previous GET request
		payload := `{
			"title":"Updated with maps",
			"description":"Test description",
			"reactions":{},
			"related_tasks":{},
			"comments":[],
			"assignees":[],
			"labels":[],
			"attachments":[]
		}`

		req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/1", strings.NewReader(payload))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		req.Header.Set(echo.HeaderAuthorization, "Bearer "+token)

		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)

		t.Logf("Response status: %d", rec.Code)
		t.Logf("Response body: %s", rec.Body.String())

		require.Equal(t, http.StatusOK, rec.Code, "Should not panic with 'hash of unhashable type'. Body: %s", rec.Body.String())
		assert.Contains(t, rec.Body.String(), `"title":"Updated with maps"`)
	})

	t.Run("POST to /api/v1/tasks/1 with populated reactions", func(t *testing.T) {
		// Simulating when the frontend sends back a task with actual reactions data
		payload := `{
			"title":"Updated with populated maps",
			"reactions":{
				"👍":[{"id":1,"username":"user1"}]
			},
			"related_tasks":{
				"subtask":[{"id":2,"title":"Related"}]
			},
			"comments":[
				{
					"id":1,
					"comment":"Test comment",
					"reactions":{
						"❤️":[{"id":2,"username":"user2"}]
					}
				}
			]
		}`

		req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/1", strings.NewReader(payload))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		req.Header.Set(echo.HeaderAuthorization, "Bearer "+token)

		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)

		t.Logf("Response status: %d", rec.Code)
		t.Logf("Response body: %s", rec.Body.String())

		require.Equal(t, http.StatusOK, rec.Code, "Should handle populated map fields. Body: %s", rec.Body.String())
		assert.Contains(t, rec.Body.String(), `"title":"Updated with populated maps"`)
	})

	t.Run("GET then POST - real frontend flow", func(t *testing.T) {
		// Step 1: GET the task (simulating frontend fetch)
		reqGet := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/1?expand[]=reactions&expand[]=comments", nil)
		reqGet.Header.Set(echo.HeaderAuthorization, "Bearer "+token)
		reqGet.URL.RawQuery = url.Values{
			"expand[]": []string{"reactions", "comments"},
		}.Encode()

		recGet := httptest.NewRecorder()
		e.ServeHTTP(recGet, reqGet)

		require.Equal(t, http.StatusOK, recGet.Code, "GET should succeed")
		taskJSON := recGet.Body.String()
		t.Logf("GET response: %s", taskJSON)

		// Step 2: Modify the task and POST it back (simulating frontend update)
		// We'll parse and modify the JSON, then send it back
		payload := `{
			"title":"Updated after GET",
			"description":"Modified",
			"reactions":{},
			"related_tasks":{},
			"comments":[]
		}`

		reqPost := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/1", strings.NewReader(payload))
		reqPost.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		reqPost.Header.Set(echo.HeaderAuthorization, "Bearer "+token)

		recPost := httptest.NewRecorder()
		e.ServeHTTP(recPost, reqPost)

		t.Logf("POST response status: %d", recPost.Code)
		t.Logf("POST response body: %s", recPost.Body.String())

		require.Equal(t, http.StatusOK, recPost.Code, "POST after GET should succeed without panic. Body: %s", recPost.Body.String())
		assert.Contains(t, recPost.Body.String(), `"title":"Updated after GET"`)
	})
}
