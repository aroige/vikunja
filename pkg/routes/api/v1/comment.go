package v1

import (
	"net/http"
	"strconv"

	"code.vikunja.io/api/pkg/db"
	"code.vikunja.io/api/pkg/models"
	"code.vikunja.io/api/pkg/modules/auth"
	"code.vikunja.io/api/pkg/services"
	"code.vikunja.io/api/pkg/user"
	"code.vikunja.io/api/pkg/web/handler"
	"github.com/labstack/echo/v4"
)

// CreateComment handles creating a new comment on a task.
func CreateComment(c echo.Context) error {
	s := db.NewSession()
	defer s.Close()

	taskID, err := strconv.ParseInt(c.Param("task"), 10, 64)
	if err != nil {
		return handler.HandleHTTPError(err)
	}

	var tc models.TaskComment
	if err := c.Bind(&tc); err != nil {
		return handler.HandleHTTPError(err)
	}
	tc.TaskID = taskID

	auth, err := auth.GetAuthFromClaims(c)
	if err != nil {
		return handler.HandleHTTPError(err)
	}

	user, ok := auth.(*user.User)
	if !ok {
		return echo.NewHTTPError(http.StatusForbidden, "You are not allowed to do that.")
	}

	cs := services.NewCommentService()
	if err := cs.Create(s, &tc, user); err != nil {
		_ = s.Rollback()
		return handler.HandleHTTPError(err)
	}

	if err := s.Commit(); err != nil {
		return handler.HandleHTTPError(err)
	}

	return c.JSON(http.StatusCreated, tc)
}
