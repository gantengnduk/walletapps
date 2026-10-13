package dtos

type RatePreviewRequest struct {
	From   string `query:"from" validate:"required"`
	To     string `query:"to" validate:"required"`
	Amount string `query:"amount"`
}

type RatePreviewResponse struct {
	From         string `json:"from"`
	To           string `json:"to"`
	Rate         string `json:"rate"`
	SourceAmount string `json:"source_amount"`
	TargetAmount string `json:"target_amount"`
}

