package patients

import "net/http"

type PatientService interface {
	GetPatients(w http.ResponseWriter, r *http.Request)
	GetPatientByID(w http.ResponseWriter, r *http.Request)
	GetFlaggedPatients(w http.ResponseWriter, r *http.Request)
	AddFlaggedPatient(w http.ResponseWriter, r *http.Request)
	RemoveFlaggedPatient(w http.ResponseWriter, r *http.Request)
	KeepPatient(w http.ResponseWriter, r *http.Request)
}