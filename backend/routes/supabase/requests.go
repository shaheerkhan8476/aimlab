package supabase

import (
	"github.com/google/uuid"
)

// User Create Request Model
type UserCreateRequest struct {
	Name            string `json:"name"`
	Password        string `json:"password"`
	Email           string `json:"email"`
	IsAdmin         bool   `json:"isAdmin"`
	StudentStanding string `json:"studentStanding"`
}

// User Login Request Model
type UserLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Task Create Request Model
type TaskCreateRequest struct {
	PatientTaskCount      int  `json:"patient_task_count"`
	LabResultTaskCount    int  `json:"lab_result_task_count"`
	PrescriptionTaskCount int  `json:"prescription_task_count"`
	GenerateQuestion      bool `json:"generate_question"`
}

// Task Get Request Model
type TaskGetRequest struct {
	GetIncompleteTasks *bool `json:"get_incomplete_tasks,omitempty"`
	GetCompleteTasks   *bool `json:"get_complete_tasks,omitempty"`
}

type TaskCompleteRequest struct {
	StudentResponse string `json:"student_response"`
	LLMResponse     string `json:"llm_response"`
	LLMFeedback     string `json:"llm_feedback"`
}

type FlaggedPatientRequest struct {
	PatientID uuid.UUID `json:"patient_id"`
	UserID    uuid.UUID `json:"user_id"`
}
type InsertFlaggedPatient struct {
	ID        uuid.UUID   `json:"id"`
	PatientID uuid.UUID   `json:"patient_id"`
	Flaggers  []uuid.UUID `json:"flaggers"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type UpdateUserInput struct {
	Email        string                 `json:"email,omitempty"`
	Password     string                 `json:"password,omitempty"`
	AppMetadata  map[string]interface{} `json:"app_metadata,omitempty"`
	UserMetadata map[string]interface{} `json:"user_metadata,omitempty"`
}

type ResetPasswordRequest struct {
	AccessToken string `json:"accessToken"`
	NewPassword string `json:"newPassword"`
}

type AddStudentRequest struct {
	InstructorId string `json:"instructor_id"`
	StudentId    string `json:"student_id"`
}
