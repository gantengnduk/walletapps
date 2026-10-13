package config

import (
	"os"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	External ExternalConfig
}

type ServerConfig struct {
	Port string
	Env  string
}

type DatabaseConfig struct {
	Driver string
	Path   string
}

type ExternalConfig struct {
	FrankfurterBaseURL string
}

func LoadConfig() Config {
	port := getEnv("PORT", "8080")
	env := getEnv("ENV", "development")
	dbDriver := getEnv("DB_DRIVER", "sqlite")
	dbPath := getEnv("DB_PATH", "./wallet.db")
	frankfurterURL := getEnv("FRANKFURTER_BASE_URL", "https://api.frankfurter.dev")

	return Config{
		Server: ServerConfig{
			Port: port,
			Env:  env,
		},
		Database: DatabaseConfig{
			Driver: dbDriver,
			Path:   dbPath,
		},
		External: ExternalConfig{
			FrankfurterBaseURL: frankfurterURL,
		},
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

