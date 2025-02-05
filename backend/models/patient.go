package model

import "github.com/google/uuid"

type Patient struct {
	ID                   uuid.UUID `json:"id"`
	Name                 string    `json:"name"`
	DateOfBirth          string    `json:"date_of_birth"`
	Age                  int       `json:"age"`
	Gender               string    `json:"gender"`
	MedicalCondition     string    `json:"medical_condition"`
	MedicalHistory       string    `json:"medical_history"`
	FamilyMedicalHistory string    `json:"family_medical_history"`
	SurgicalHistory      string    `json:"surgical_history"`
	Cholesterol          string    `json:"cholesterol"`
	Allergies            string    `json:"allergies"`
	Medications          string    `json:"medications"`
	PatientMessage       string    `json:"patient_message"`
}

type Prescription struct {
	ID            int    		`json:"id"`
	Patient_id    uuid.UUID   	`json:"patient_id"`
	Name          string 		`json:"name"`
	Medication    string 		`json:"medication"`
	Dose          string 		`json:"dose"`
	Refill_status string 		`json:"refill_status"`
}
