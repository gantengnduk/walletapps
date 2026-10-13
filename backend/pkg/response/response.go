package response

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	"walletapps/backend/pkg/apperror"
	"walletapps/backend/pkg/constants"
)

type SuccessResponse struct {
	Code    int    `json:"code" example:"200"`
	Message string `json:"message" example:"success"`
	Data    any    `json:"data,omitempty"`
}

func (s SuccessResponse) Send(c echo.Context) error {
	return c.JSON(s.Code, s)
}

func SuccessBuilder(data any) SuccessResponse {
	return SuccessResponse{
		Code:    http.StatusOK,
		Message: constants.Success.String(),
		Data:    data,
	}
}

func SuccessCreatedBuilder(data any) SuccessResponse {
	return SuccessResponse{
		Code:    http.StatusCreated,
		Message: constants.Success.String(),
		Data:    data,
	}
}

func SuccessNoContentBuilder() SuccessResponse {
	return SuccessResponse{
		Code:    http.StatusNoContent,
		Message: constants.Success.String(),
	}
}

type FailedResponse struct {
	Code    int    `json:"code" example:"400"`
	Message string `json:"message" example:"bad_request"`
	Error   string `json:"error" example:"error message"`
	Data    any    `json:"data,omitempty"`
}

func (f FailedResponse) Send(c echo.Context) error {
	return c.JSON(f.Code, f)
}

func ErrorBuilder(err error) FailedResponse {
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		return FailedResponse{
			Code:    appErr.Code,
			Message: appErr.Message.String(),
			Error:   appErr.Error(),
		}
	}

	var echoErr *echo.HTTPError
	if errors.As(err, &echoErr) {
		msg := http.StatusText(echoErr.Code)
		if echoErr.Message != nil {
			msg = echoErr.Error()
		}
		return FailedResponse{
			Code:    echoErr.Code,
			Message: http.StatusText(echoErr.Code),
			Error:   msg,
		}
	}

	errStr := "internal server error"
	if err != nil {
		errStr = err.Error()
	}

	return FailedResponse{
		Code:    http.StatusInternalServerError,
		Message: constants.InternalServerError.String(),
		Error:   errStr,
	}
}

func ErrorWithDataBuilder(err error, data any) FailedResponse {
	res := ErrorBuilder(err)
	res.Data = data
	return res
}

