package patients

import (
	"encoding/json"
	"io"
	"net/http"

	"fmt"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	supabase "github.com/nedpals/supabase-go"
	model "gitlab.msu.edu/team-corewell-2025/models"
	request "gitlab.msu.edu/team-corewell-2025/routes/supabase"
)

type PatientHandler struct {
	Supabase *supabase.Client
}

func (h *PatientHandler) GetPatients(w http.ResponseWriter, r *http.Request) {
	var patients []model.Patient

	err := h.Supabase.DB.From("patients").Select("*").Execute(&patients)

	if err != nil {
		msg := fmt.Sprintf("GetPatients: error selecting from DB: %v", err)
		fmt.Println(msg)
		http.Error(w, "Patients not found", http.StatusNotFound) // 404
		return
	}
	patientsJSON, err := json.MarshalIndent(patients, "", "  ")
	if err != nil {
		msg := fmt.Sprintf("GetPatients: error marshaling JSON: %v", err)
		fmt.Println(msg)
		http.Error(w, "Failed to convert patients to JSON", http.StatusInternalServerError) // 500
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(patientsJSON)
}

/**
 * GetPatientByID fetches a patient by ID from the database
 * @param w http.ResponseWriter
 * @param r *http.Request	Authenticated request
 */
func (h *PatientHandler)GetPatientByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"] // gets ID from URL

	var patient []model.Patient // holds query output

	// Queries database for patient using ID from URL, unmarshals into patient struct and returns error, if any
	err := h.Supabase.DB.From("patients").Select("*").Eq("id", id).Execute(&patient)

	if err != nil {
		msg := fmt.Sprintf("GetPatientByID: DB select error (id=%s): %v", id, err)
		fmt.Println(msg)
		http.Error(w, "Error fetching patient", http.StatusInternalServerError)
		return
	}

	if len(patient) == 0 {
		http.Error(w, "Patient not found", http.StatusNotFound) // 404
		return
	}

	// fmt.Println("Patient found:", patient)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patient[0])
}

func (h *PatientHandler) GetFlaggedPatients(w http.ResponseWriter, r *http.Request) {
	var flaggedPatients []model.FlaggedPatient
	err := h.Supabase.DB.From("flagged").Select("*,patient:patients!flagged_patient_id_fkey(*)").Execute(&flaggedPatients)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error grabbing Flagged Patients", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(flaggedPatients)
	if err != nil {
		msg := fmt.Sprintf("GetFlaggedPatients: error encoding flagged patients: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusInternalServerError)
		return
	}
}
func (h *PatientHandler) AddFlaggedPatient(w http.ResponseWriter, r *http.Request) {
	var req request.FlaggedPatientRequest
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		fmt.Println(err)
		http.Error(w, "Error unmarshaling request", http.StatusBadRequest)
		return
	}

	var existing []request.InsertFlaggedPatient
	err = h.Supabase.DB.
		From("flagged").
		Select("*").
		Eq("patient_id", req.PatientID.String()).
		Execute(&existing)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error checking flagged table", http.StatusInternalServerError)
		return
	}

	if len(existing) == 0 {
		newFlag := request.InsertFlaggedPatient{
			ID:        uuid.New(),
			PatientID: req.PatientID,
			Flaggers:  []uuid.UUID{req.UserID},
			Messages: map[string]string{
				req.Name: req.Explanation,
			},
		}

		err = h.Supabase.DB.
			From("flagged").
			Insert(newFlag).
			Execute(nil)
		if err != nil {
			fmt.Println(err)
			http.Error(w, "Error inserting new flagged row", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Patient flagged successfully (new row)"))
		return
	}

	flaggedRow := existing[0]

	alreadyFlagged := false
	for _, uid := range flaggedRow.Flaggers {
		if uid == req.UserID {
			alreadyFlagged = true
			break
		}
	}
	if alreadyFlagged {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("User has already flagged this patient"))
		return
	}

	flaggedRow.Flaggers = append(flaggedRow.Flaggers, req.UserID)
	if flaggedRow.Messages == nil {
		flaggedRow.Messages = make(map[string]string)
	}
	flaggedRow.Messages[req.Name] = req.Explanation
	updateData := map[string]interface{}{
		"flaggers": flaggedRow.Flaggers,
		"messages": flaggedRow.Messages,
	}

	err = h.Supabase.DB.
		From("flagged").
		Update(updateData).
		Eq("id", flaggedRow.ID.String()).
		Execute(nil)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error updating flagged row", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Patient flagged successfully (updated existing row)"))
}

func (h *PatientHandler) RemoveFlaggedPatient(w http.ResponseWriter, r *http.Request) {
	var request request.FlaggedPatientRequest
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	err = json.Unmarshal(bodyBytes, &request)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Invalid JSON in request body", http.StatusBadRequest)
		return
	}
	patientID := request.PatientID.String()
	err = h.Supabase.DB.From("patients").Delete().Eq("id", patientID).Execute(nil)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Could not delete from patients", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Patient Removed"))
}

func (h *PatientHandler) KeepPatient(w http.ResponseWriter, r *http.Request) {
	var request request.FlaggedPatientRequest
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		msg := fmt.Sprintf("KeepPatient: failed to read request body: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	err = json.Unmarshal(bodyBytes, &request)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Invalid JSON in request body", http.StatusBadRequest)
		return
	}
	patientID := request.PatientID.String()
	err = h.Supabase.DB.From("flagged").Delete().Eq("patient_id", patientID).Execute(nil)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Could not delete from flagged", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Patient Kept"))
}
