package model

import (
	"time"

	"github.com/google/uuid"
)

type Task struct {
	// Id              int64     `json:"id"`  // This seems to cause issues with unique constraints because default = 0
	CreatedAt       time.Time `json:"created_at"`
	PatientId       uuid.UUID `json:"patient_id"`
	UserId          uuid.UUID `json:"user_id"`
	PatientQuestion *string   `json:"patient_question,omitempty"`
	StudentResponse *string   `json:"student_response,omitempty"`
	LLMFeedback     *string   `json:"llm_feedback,omitempty"`
	Completed       bool      `json:"completed"`
}
