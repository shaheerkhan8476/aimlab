package model

import (
	"github.com/google/uuid"
)

type User struct {
    Id              uuid.UUID    `json:"id"`
    Name            string       `json:"name"`
    Email           string       `json:"email"`
    IsAdmin         bool         `json:"isAdmin"`
    StudentStanding *string      `json:"studentStanding"`
    Students        []uuid.UUID  `json:"students"`
}
