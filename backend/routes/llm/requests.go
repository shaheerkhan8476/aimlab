package llm

import (
	"github.com/google/uuid"
)
type MessageRequest struct {
	ID      uuid.UUID `json:"id"`
	Message string    `json:"message"`
}

