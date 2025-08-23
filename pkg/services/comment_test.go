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
)

func TestCommentCreate(t *testing.T) {
	db.LoadAndAssertFixtures(t)
	s := db.NewSession()
	defer s.Close()

	cs := NewCommentService()

	testUser, err := user.GetUserByID(s, 1)
	assert.NoError(t, err)

	// Create a comment
	comment := &models.TaskComment{
		Comment:  "test comment",
		AuthorID: testUser.ID,
		TaskID:   1,
	}

	err = cs.Create(s, comment, testUser)
	assert.NoError(t, err)

	// Verify the comment was created
	var createdComment models.TaskComment
	_, err = s.Where("id = ?", comment.ID).Get(&createdComment)
	assert.NoError(t, err)
	assert.Equal(t, "test comment", createdComment.Comment)
}
