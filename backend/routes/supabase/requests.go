package supabase

import "github.com/google/uuid"

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

type FlaggedPatientRequest struct {
	Id        uuid.UUID `json:"id"`
	PatientID uuid.UUID `json:"patient_id"`
}
