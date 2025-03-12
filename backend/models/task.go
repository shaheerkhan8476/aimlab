package model

import (
	"time"

	"github.com/google/uuid"
)

// Define the custom type for the enum
type TaskType string

// Define the possible values for the enum
const (
	PatientQuestionTaskType TaskType = "patient_question"
	LabResultTaskType       TaskType = "lab_result"
	PrescriptionTaskType    TaskType = "prescription"
)

// Base Task struct
type Task struct {
	Id          *uuid.UUID `json:"id,omitempty"`         // Pointer to allow NULL instead of default zero UUID
	CreatedAt   *time.Time `json:"created_at,omitempty"` // Pointer to avoid default time
	PatientId   uuid.UUID  `json:"patient_id"`
	UserId      uuid.UUID  `json:"user_id"`
	TaskType    TaskType   `json:"task_type"`
	Completed   bool       `json:"completed"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// Shared method for marking a task as completed
// NOT USED ANYMORE, completing a task updates the DB directly instead of altering a struct
func (t *Task) CompleteTask() {
	t.Completed = true
}

// Define the different types of tasks
type PatientTask struct {
	Task
	PatientQuestion *string `json:"patient_question,omitempty"`
	StudentResponse *string `json:"student_response,omitempty"`
	LLMFeedback     *string `json:"llm_feedback,omitempty"`
}

type ResultTask struct {
	Task
	ResultId        uuid.UUID `json:"result_id,omitempty"`
	StudentResponse *string   `json:"student_response,omitempty"`
	LLMFeedback     *string   `json:"llm_feedback,omitempty"`
}

type PrescriptionTask struct {
	Task
	PrescriptionId uuid.UUID `json:"prescription_id"`
}
