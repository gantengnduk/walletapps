package constants

type ResponseMessage string

const (
	Success             ResponseMessage = "success"
	BadRequest          ResponseMessage = "bad_request"
	NotFound            ResponseMessage = "not_found"
	UnprocessableEntity ResponseMessage = "unprocessable_entity"
	Conflict            ResponseMessage = "conflict"
	InternalServerError ResponseMessage = "internal_server_error"
)

func (r ResponseMessage) String() string {
	return string(r)
}

