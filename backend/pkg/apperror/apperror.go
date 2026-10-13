package apperror

import (
	"fmt"
	"net/http"

	"walletapps/backend/pkg/constants"
)

type AppError struct {
	Code    int                       `json:"code"`
	Message constants.ResponseMessage `json:"message"`
	Detail  string                    `json:"detail"`
}

func (e *AppError) Error() string {
	if e.Detail != "" {
		return e.Detail
	}
	return e.Message.String()
}

func NewBadRequest(detail string) *AppError {
	return &AppError{
		Code:    http.StatusBadRequest,
		Message: constants.BadRequest,
		Detail:  detail,
	}
}

func NewNotFound(detail string) *AppError {
	return &AppError{
		Code:    http.StatusNotFound,
		Message: constants.NotFound,
		Detail:  detail,
	}
}

func NewUnprocessableEntity(detail string) *AppError {
	return &AppError{
		Code:    http.StatusUnprocessableEntity,
		Message: constants.UnprocessableEntity,
		Detail:  detail,
	}
}

func NewConflict(detail string) *AppError {
	return &AppError{
		Code:    http.StatusConflict,
		Message: constants.Conflict,
		Detail:  detail,
	}
}

func NewInternal(err error) *AppError {
	detail := "internal server error"
	if err != nil {
		detail = err.Error()
	}
	return &AppError{
		Code:    http.StatusInternalServerError,
		Message: constants.InternalServerError,
		Detail:  detail,
	}
}

func Wrap(err error, code int, message constants.ResponseMessage) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Detail:  fmt.Sprintf("%v", err),
	}
}

