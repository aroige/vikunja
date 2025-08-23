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
	"code.vikunja.io/api/pkg/models"
	"code.vikunja.io/api/pkg/user"
	"xorm.io/xorm"
)

type CommentService struct{}

func NewCommentService() *CommentService {
	return &CommentService{}
}

// Create creates a new task comment.
func (cs *CommentService) Create(s *xorm.Session, tc *models.TaskComment, u *user.User) error {
	can, err := tc.CanCreate(s, u)
	if err != nil {
		return err
	}
	if !can {
		return models.ErrGenericForbidden{}
	}

	return tc.Create(s, u)
}
