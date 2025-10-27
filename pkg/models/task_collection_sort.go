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

import "strings"

type (
	sortParam struct {
		sortBy        string
		orderBy       SortOrder // asc or desc
		projectViewID int64
	}

	// SortParam is an exported alias for sortParam for service layer use
	SortParam = sortParam

	SortOrder string
)

// NewSortParam creates a new SortParam for service layer use.
// This constructor ensures proper initialization of sort parameters in the service layer.
func NewSortParam(sortBy string, orderBy SortOrder, projectViewID int64) *SortParam {
	return &SortParam{
		sortBy:        sortBy,
		orderBy:       orderBy,
		projectViewID: projectViewID,
	}
}

const (
	taskPropertyID          string = "id"
	taskPropertyTitle       string = "title"
	taskPropertyDescription string = "description"
	taskPropertyDone        string = "done"
	taskPropertyDoneAt      string = "done_at"
	taskPropertyDueDate     string = "due_date"
	taskPropertyCreatedByID string = "created_by_id"
	taskPropertyProjectID   string = "project_id"
	taskPropertyRepeatAfter string = "repeat_after"
	taskPropertyPriority    string = "priority"
	taskPropertyStartDate   string = "start_date"
	taskPropertyEndDate     string = "end_date"
	taskPropertyHexColor    string = "hex_color"
	taskPropertyPercentDone string = "percent_done"
	taskPropertyUID         string = "uid"
	taskPropertyCreated     string = "created"
	taskPropertyUpdated     string = "updated"
	taskPropertyPosition    string = "position"
	taskPropertyBucketID    string = "bucket_id"

	// Exported constants for service layer use
	TaskPropertyID          = taskPropertyID
	TaskPropertyTitle       = taskPropertyTitle
	TaskPropertyDescription = taskPropertyDescription
	TaskPropertyDone        = taskPropertyDone
	TaskPropertyDoneAt      = taskPropertyDoneAt
	TaskPropertyDueDate     = taskPropertyDueDate
	TaskPropertyCreatedByID = taskPropertyCreatedByID
	TaskPropertyProjectID   = taskPropertyProjectID
	TaskPropertyRepeatAfter = taskPropertyRepeatAfter
	TaskPropertyPriority    = taskPropertyPriority
	TaskPropertyStartDate   = taskPropertyStartDate
	TaskPropertyEndDate     = taskPropertyEndDate
	TaskPropertyHexColor    = taskPropertyHexColor
	TaskPropertyPercentDone = taskPropertyPercentDone
	TaskPropertyUID         = taskPropertyUID
	TaskPropertyCreated     = taskPropertyCreated
	TaskPropertyUpdated     = taskPropertyUpdated
	TaskPropertyPosition    = taskPropertyPosition
	TaskPropertyBucketID    = taskPropertyBucketID

	taskPropertyIndex         string = "index"
	taskPropertyProjectViewID string = "project_view_id"
	taskPropertyAssignees     string = "assignees"
	taskPropertyLabels        string = "labels"
	taskPropertyReminders     string = "reminders"
)

const (
	orderInvalid    SortOrder = "invalid"
	orderAscending  SortOrder = "asc"
	orderDescending SortOrder = "desc"

	// Exported constants for service layer use
	OrderInvalid    = orderInvalid
	OrderAscending  = orderAscending
	OrderDescending = orderDescending
)

func (o SortOrder) String() string {
	return string(o)
}

func getSortOrderFromString(s string) SortOrder {
	// Normalize the input: trim whitespace and convert to lowercase
	normalized := strings.ToLower(strings.TrimSpace(s))

	switch normalized {
	case "asc", "ascending":
		return orderAscending
	case "desc", "descending":
		return orderDescending
	case "": // Only handle empty/missing case gracefully
		return orderAscending
	default:
		// For invalid values, return them as-is so validation can catch them
		return SortOrder(normalized)
	}
}

func (sp *sortParam) validate() error {
	if sp.orderBy != orderDescending && sp.orderBy != orderAscending {
		return ErrInvalidSortOrder{OrderBy: sp.orderBy}
	}

	if sp.sortBy == taskPropertyPosition && sp.projectViewID == 0 {
		return ErrMustHaveProjectViewToSortByPosition{}
	}

	return validateTaskFieldForSorting(sp.sortBy)
}

func validateTaskFieldForSorting(fieldName string) error {
	switch fieldName {
	case
		taskPropertyID,
		taskPropertyTitle,
		taskPropertyDescription,
		taskPropertyDone,
		taskPropertyDoneAt,
		taskPropertyDueDate,
		taskPropertyCreatedByID,
		taskPropertyProjectID,
		taskPropertyRepeatAfter,
		taskPropertyPriority,
		taskPropertyStartDate,
		taskPropertyEndDate,
		taskPropertyHexColor,
		taskPropertyPercentDone,
		taskPropertyUID,
		taskPropertyCreated,
		taskPropertyUpdated,
		taskPropertyPosition,
		taskPropertyBucketID,
		taskPropertyIndex:
		return nil
	}
	return ErrInvalidTaskField{TaskField: fieldName}
}
