package model

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	Id      uuid.UUID `json:"id"`
	Name    string    `json:"name"`
	Email   string    `json:"email"`
	IsAdmin bool      `json:"isAdmin"`
}

type Patient struct {
	ID                   int       `json:"id"`
	Name                 string    `json:"name"`
	DateOfBirth          time.Time `json:"date_of_birth"`
	Age                  int       `json:"age"`
	Gender               string    `json:"gender"`
	MedicalCondition     *string   `json:"medical_condition"`
	MedicalHistory       *string   `json:"medical_history"`
	FamilyMedicalHistory *string   `json:"family_medical_history"`
	SurgicalHistory      *string   `json:"surgical_history"`
	Cholesterol          *string   `json:"cholesterol"`
	Allergies            *string   `json:"allergies"`
	Medications          *string   `json:"medications"`
	PatientMessage       *string   `json:"patient_message"`
}
