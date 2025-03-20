package model

import "github.com/google/uuid"

type Patient struct {
	Id                   uuid.UUID         `json:"id"`
	Name                 string            `json:"name"`
	DateOfBirth          string            `json:"date_of_birth"`
	Age                  int               `json:"age"`
	Gender               string            `json:"gender"`
	MedicalCondition     string            `json:"medical_condition"`
	MedicalHistory       string            `json:"medical_history"`
	FamilyMedicalHistory string            `json:"family_medical_history"`
	SurgicalHistory      string            `json:"surgical_history"`
	Cholesterol          string            `json:"cholesterol"`
	Allergies            string            `json:"allergies"`
	PatientMessage       string            `json:"patient_message"`
	PDMP                 []PDMPEntry       `json:"pdmp"`
	Immunization         map[string]string `json:"immunization"`
	Height               string            `json:"height"`
	Weight               string            `json:"weight"`
	BP                   string            `json:"last_bp"`
}

type PDMPEntry struct {
	DateFilled  string `json:"date_filled"`
	DateWritten string `json:"date_written"`
	Drug        string `json:"drug"`
	Qty         int    `json:"qty"`
	Days        int    `json:"days"`
	Refill      int    `json:"refill"`
}

type EmbeddedPatient struct {
	Name string `json:"name"`
}

type Prescription struct {
	ID         uuid.UUID       `json:"id"`
	Patient_id uuid.UUID       `json:"patient_id"`
	Medication string          `json:"medication"`
	Dose       string          `json:"dose"`
	Patient    EmbeddedPatient `json:"patient"`
}

type Result struct {
	ID          uuid.UUID       `json:"id"`
	Patient_id  uuid.UUID       `json:"patient_id"`
	Test_name   string          `json:"test_name"`
	Test_date   string          `json:"test_date"`
	Test_result map[string]any  `json:"test_result"`
	Patient     EmbeddedPatient `json:"patient"`
}

type FlaggedPatient struct {
	ID        uuid.UUID   `json:"id"`
	PatientID uuid.UUID   `json:"patient_id"`
	Flaggers  []uuid.UUID `json:"flaggers"`
	Patient   struct {
		Name string `json:"name"`
	} `json:"patient"`
}
