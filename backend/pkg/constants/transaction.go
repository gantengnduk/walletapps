package constants

type TransactionType string

const (
	TransactionTypeDeposit    TransactionType = "DEPOSIT"
	TransactionTypeWithdrawal TransactionType = "WITHDRAWAL"
	TransactionTypeTransfer   TransactionType = "TRANSFER"
	TransactionTypeConvert    TransactionType = "CONVERT"
)

func (t TransactionType) String() string {
	return string(t)
}

type TransactionStatus string

const (
	TransactionStatusCompleted TransactionStatus = "COMPLETED"
	TransactionStatusFailed    TransactionStatus = "FAILED"
)

func (s TransactionStatus) String() string {
	return string(s)
}

type LedgerEntryType string

const (
	LedgerEntryDebit  LedgerEntryType = "DEBIT"
	LedgerEntryCredit LedgerEntryType = "CREDIT"
)

func (l LedgerEntryType) String() string {
	return string(l)
}

