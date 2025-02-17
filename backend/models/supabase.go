package model

import "github.com/google/uuid"

type Patient struct {
	Id                   uuid.UUID `json:"id"`
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
	PatientMessage       string    `json:"patient_message"`
}

type EmbeddedPatient struct {
	Name string `json:"name"`
}

type Prescription struct {
	ID            uuid.UUID       `json:"id"`
	Patient_id    uuid.UUID       `json:"patient_id"`
	Medication    string          `json:"medication"`
	Dose          string          `json:"dose"`
	Refill_status string          `json:"refill_status"`
	Patient       EmbeddedPatient `json:"patient"`
}

type Result struct {
	ID          uuid.UUID       `json:"id"`
	Patient_id  uuid.UUID       `json:"patient_id"`
	Test_name   string          `json:"test_name"`
	Test_date   string          `json:"test_date"`
	Test_result map[string]bool `json:"test_result"`
	Patient     EmbeddedPatient `json:"patient"`
}
