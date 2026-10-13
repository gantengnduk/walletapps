package dtos

type MarketRateItem struct {
	Pair        string `json:"pair"`
	From        string `json:"from"`
	To          string `json:"to"`
	Rate        string `json:"rate"`
	InverseRate string `json:"inverse_rate"`
}

type MarketRatesResponse struct {
	Date     string           `json:"date"`
	Provider string           `json:"provider"`
	Pairs    []MarketRateItem `json:"pairs"`
}

