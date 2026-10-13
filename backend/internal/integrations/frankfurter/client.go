package frankfurter

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/shopspring/decimal"
	"walletapps/backend/pkg/apperror"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string, timeout time.Duration) *Client {
	if baseURL == "" {
		baseURL = "https://api.frankfurter.dev"
	}
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) GetCurrencies(ctx context.Context) (map[string]string, error) {
	reqURL := fmt.Sprintf("%s/v1/currencies", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create currencies request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, apperror.NewInternal(fmt.Errorf("failed to reach Frankfurter currencies API: %w", err))
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, apperror.NewInternal(fmt.Errorf("Frankfurter returned status %d for currencies", resp.StatusCode))
	}

	var currencies map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&currencies); err != nil {
		return nil, fmt.Errorf("failed to decode currencies response: %w", err)
	}

	return currencies, nil
}

type latestRatesResponse struct {
	Amount decimal.Decimal            `json:"amount"`
	Base   string                     `json:"base"`
	Date   string                     `json:"date"`
	Rates  map[string]decimal.Decimal `json:"rates"`
}

func (c *Client) GetLatestRate(ctx context.Context, from, to string) (decimal.Decimal, error) {
	from = strings.ToUpper(strings.TrimSpace(from))
	to = strings.ToUpper(strings.TrimSpace(to))

	if from == "" || to == "" {
		return decimal.Zero, apperror.NewBadRequest("source and target currencies cannot be empty")
	}

	if from == to {
		return decimal.NewFromInt(1), nil
	}

	reqURL := fmt.Sprintf("%s/v1/latest?from=%s&to=%s", c.baseURL, url.QueryEscape(from), url.QueryEscape(to))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return decimal.Zero, fmt.Errorf("failed to create exchange rate request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return decimal.Zero, apperror.NewInternal(fmt.Errorf("failed to reach Frankfurter exchange rate API: %w", err))
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errBody struct {
			Message string `json:"message"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&errBody)
		msg := errBody.Message
		if msg == "" {
			msg = fmt.Sprintf("status code %d", resp.StatusCode)
		}
		return decimal.Zero, apperror.NewBadRequest(fmt.Sprintf("Frankfurter rate lookup failed: %s", msg))
	}

	var result latestRatesResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return decimal.Zero, fmt.Errorf("failed to decode exchange rate response: %w", err)
	}

	rate, found := result.Rates[to]
	if !found {
		return decimal.Zero, apperror.NewBadRequest(fmt.Sprintf("currency %s not found in rate response for base %s", to, from))
	}

	return rate, nil
}

