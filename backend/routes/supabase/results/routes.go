package results

import (
	"encoding/json"
	"net/http"

	"fmt"

	"github.com/gorilla/mux"
	supabase "github.com/nedpals/supabase-go"
	model "gitlab.msu.edu/team-corewell-2025/models"
)

type ResultHandler struct {
	Supabase *supabase.Client
}

func (h *ResultHandler) GetResults(w http.ResponseWriter, r *http.Request) {
	var results []model.Result
	err := h.Supabase.DB.From("results").Select("*,patient:patients(name)").Execute(&results)
	if err != nil {
		msg := fmt.Sprintf("GetResults: DB error: %v", err)
		fmt.Println(msg)
		http.Error(w, "Error fetching results", http.StatusBadRequest)
		return
	}
	if len(results) == 0 {
		http.Error(w, "No Results in Database", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func (h *ResultHandler) GetResultByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	var result []model.Result
	err := h.Supabase.DB.From("results").Select("*,patient:patients(name)").Eq("id", id).Execute(&result)
	if err != nil {
		msg := fmt.Sprintf("GetResultByID: DB error (id=%s): %v", id, err)
		fmt.Println(msg)
		http.Error(w, "Grabbing Result Error", http.StatusBadRequest)
		return
	}
	if len(result) == 0 {
		http.Error(w, "Result not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result[0])
}
func (h *ResultHandler) GetResultsByPatientID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	var results []model.Result
	err := h.Supabase.DB.From("results").Select("*").Eq("patient_id", id).Execute(&results)
	if err != nil {
		msg := fmt.Sprintf("GetResultsByPatientID: DB error (patient_id=%s): %v", id, err)
		fmt.Println(msg)
		http.Error(w, "Results not found", http.StatusNotFound)
		return
	}
	if len(results) == 0 {
		http.Error(w, "No results found for that patient", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)

}
