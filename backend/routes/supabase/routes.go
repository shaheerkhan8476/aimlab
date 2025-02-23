package supabase

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"bytes"
	"fmt"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	supabase "github.com/nedpals/supabase-go"
	model "gitlab.msu.edu/team-corewell-2025/models"
)

// LLM service URL
const llmURL = "http://127.0.0.1:5001/api/message-request"

var Supabase *supabase.Client

// Initializes the Database client
func InitClient(url, key string) *supabase.Client {
	Supabase = supabase.CreateClient(url, key)
	return Supabase
}

// Signs up the user
func SignUpUser(w http.ResponseWriter, r *http.Request) {
	var userRequest UserCreateRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &userRequest)
	if err != nil {
		http.Error(w, "Cannot Unmarshal user from request", http.StatusBadRequest)
	}
	ctx := context.Background()
	user, err := Supabase.Auth.SignUp(ctx, supabase.UserCredentials{
		Email:    userRequest.Email,
		Password: userRequest.Password,
	})
	if err != nil {
		http.Error(w, "Sign Up User Error", http.StatusNotAcceptable)
	}
	parsedID, err := uuid.Parse(user.ID)
	if err != nil {
		http.Error(w, "Cannot Parse UUID correctly", http.StatusBadRequest)
	}
	newUser := model.User{
		Id:              parsedID,
		Name:            userRequest.Name,
		Email:           userRequest.Email,
		IsAdmin:         userRequest.IsAdmin,
		StudentStanding: userRequest.StudentStanding,
	}
	err = Supabase.DB.From("users").Insert(newUser).Execute(nil)
	if err != nil {
		http.Error(w, "User has already been created", http.StatusConflict)
		return
	}
	b, err := json.Marshal(user)
	if err != nil {
		fmt.Println("Marshal Error:", err)
		return
	}
	w.Write(b)
}

// Signs in the user
func SignInUser(w http.ResponseWriter, r *http.Request) {
	var userRequest UserLoginRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &userRequest)
	if err != nil {
		http.Error(w, "Cannot read request body", http.StatusBadRequest)
		return
	}
	ctx := context.Background()
	user, err := Supabase.Auth.SignIn(ctx, supabase.UserCredentials{
		Email:    userRequest.Email,
		Password: userRequest.Password,
	})
	if err != nil {
		fmt.Println("Error signing in:", err)
		http.Error(w, "Sign-in failed", http.StatusUnauthorized)
		return
	}
	Supabase.DB.AddHeader("Authorization", "Bearer "+user.AccessToken)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// Function to grab all patients from patients table
// I removed any body parsing because it's a GET -Julian
func GetPatients(w http.ResponseWriter, r *http.Request) {
	var patients []model.Patient

	err := Supabase.DB.From("patients").Select("*").Execute(&patients)

	if err != nil {
		http.Error(w, "Patient not found", http.StatusNotFound)
		return
	}
	patientsJSON, err := json.MarshalIndent(patients, "", "  ")
	if err != nil {
		fmt.Println("Error marshaling patients:", err)
		http.Error(w, "Failed to convert patients to JSON", http.StatusInternalServerError)
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
func GetPatientByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"] // gets ID from URL

	var patient []model.Patient // holds query output

	// Queries database for patient using ID from URL, unmarshals into patient struct and returns error, if any
	err := Supabase.DB.From("patients").Select("*").Eq("id", id).Execute(&patient)

	if err != nil || len(patient) == 0 { // len of 0 means no patient found in DB
		http.Error(w, "Patient not found", http.StatusNotFound)
		return
	}

	// fmt.Println("Patient found:", patient)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patient[0])
}

func GetPrescriptions(w http.ResponseWriter, r *http.Request) {
	var prescriptions []model.Prescription
	err := Supabase.DB.From("prescriptions").Select("*,patient:patients(name)").Execute(&prescriptions)
	if err != nil {
		fmt.Println(err)
	}
	prescriptionsJSON, err := json.MarshalIndent(prescriptions, "", "  ")
	if err != nil {
		fmt.Println("Error marshaling prescriptions:", err)
		http.Error(w, "Failed to convert prescriptions to JSON", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(prescriptionsJSON)

}

func GetPrescriptionByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	var prescription []model.Prescription
	err := Supabase.DB.From("prescriptions").Select("*,patient:patients(name)").Eq("id", id).Execute(&prescription)
	if err != nil {
		http.Error(w, "Prescription not found", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prescription[0])

}

func GetPrescriptionsByPatientID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	var prescription []model.Prescription
	err := Supabase.DB.From("prescriptions").Select("*,patient:patients(name)").Eq("patient_id", id).Execute(&prescription)
	if err != nil {
		http.Error(w, "Prescriptions not found", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prescription)

}

func GetStudents(w http.ResponseWriter, r *http.Request) {
	var students []model.User
	err := Supabase.DB.From("users").Select("*").Eq("isAdmin", "FALSE").Execute(&students)
	if err != nil {
		http.Error(w, "No Students Found", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(students)
}

func GetStudentById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	var student []model.User
	err := Supabase.DB.From("users").Select("*").Eq("id", id).Execute(&student)
	if err != nil || len(student) == 0 {
		http.Error(w, "Student not found", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(student[0])
}

func GetResults(w http.ResponseWriter, r *http.Request) {
	var results []model.Result
	err := Supabase.DB.From("results").Select("*,patient:patients(name)").Execute(&results)
	if err != nil {
		http.Error(w, "Grabbing Prescriptions Error", http.StatusBadRequest)
	}
	if len(results) == 0 {
		http.Error(w, "No Prescriptions in Database", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func GetResultByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	var result []model.Result
	err := Supabase.DB.From("results").Select("*,patient:patients(name)").Eq("id", id).Execute(&result)
	if err != nil {
		http.Error(w, "Grabbing Prescription Error", http.StatusBadRequest)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result[0])
}
func GetResultsByPatientID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	var results []model.Result
	err := Supabase.DB.From("results").Select("*").Eq("patient_id", id).Execute(&results)
	if err != nil {
		http.Error(w, "Results not found", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)

}

// GetLLMResponseForPatient generates an LLM-based response using full patient data,
// including related prescriptions and results.
func GetLLMResponseForPatient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Retrieve the patient record.
	var patients []model.Patient
	err := Supabase.DB.From("patients").Select("*").Eq("id", id).Execute(&patients)
	if err != nil || len(patients) == 0 {
		http.Error(w, "Patient not found", http.StatusNotFound)
		return
	}
	patient := patients[0]

	// Retrieve prescriptions for this patient.
	var prescriptions []model.Prescription
	err = Supabase.DB.From("prescriptions").Select("*,patient:patients(name)").Eq("patient_id", id).Execute(&prescriptions)
	if err != nil {
		// If an error occurs, you might choose to continue with an empty list.
		prescriptions = []model.Prescription{}
	}

	// Retrieve test results for this patient.
	var results []model.Result
	err = Supabase.DB.From("results").Select("*,patient:patients(name)").Eq("patient_id", id).Execute(&results)
	if err != nil {
		results = []model.Result{}
	}

	// Combine the patient, prescriptions, and results into one object.
	combinedData := map[string]interface{}{
		"patient":       patient,
		"prescriptions": prescriptions,
		"results":       results,
	}

	// Marshal the entire combined object into a pretty JSON string.
	combinedJSON, err := json.MarshalIndent(combinedData, "", "  ")
	if err != nil {
		http.Error(w, "Error encoding combined patient data", http.StatusInternalServerError)
		return
	}

	// Build a prompt that includes all of the data.
	prompt := fmt.Sprintf("Patient Data:\n%s\nHow should a medical student respond to this case?", string(combinedJSON))

	// Create the LLM request payload.
	llmRequest := map[string]string{
		"message": prompt,
	}

	reqBody, err := json.Marshal(llmRequest)
	if err != nil {
		http.Error(w, "Error encoding LLM request", http.StatusInternalServerError)
		return
	}

	// Send the request to the LLM microservice.
	response, err := http.Post(llmURL, "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		http.Error(w, "Error communicating with LLM", http.StatusInternalServerError)
		return
	}
	defer response.Body.Close()

	body, err := io.ReadAll(response.Body)
	if err != nil {
		http.Error(w, "Error reading LLM response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}
func GetFlaggedPatients(w http.ResponseWriter, r *http.Request) {
	var flaggedPatients []FlaggedPatientRequest
	err := Supabase.DB.From("flagged").Select("*,patient:patients(name)").Execute(&flaggedPatients)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error grabbing Flagged Patients", http.StatusInternalServerError)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(flaggedPatients)
}
func AddFlaggedPatient(w http.ResponseWriter, r *http.Request) {
	var request FlaggedPatientRequest
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	err = json.Unmarshal(bodyBytes, &request)
	if err != nil {
		http.Error(w, "Error Unmarshling Request", http.StatusInternalServerError)
		return
	}
	request.Id = uuid.New()
	err = Supabase.DB.From("flagged").Insert(request).Execute(nil)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error Inserting Patient to Flag", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Patient Flagged"))
}

func RemoveFlaggedPatient(w http.ResponseWriter, r *http.Request) {
	var request FlaggedPatientRequest
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
	err = Supabase.DB.From("flagged").Delete().Eq("patient_id", patientID).Execute(nil)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Could not delete from flagged", http.StatusInternalServerError)
		return
	}
	err = Supabase.DB.From("patients").Delete().Eq("id", patientID).Execute(nil)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Could not delete from patients", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Patient Removed"))
}

func KeepPatient(w http.ResponseWriter, r *http.Request) {
	var request FlaggedPatientRequest
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
	err = Supabase.DB.From("flagged").Delete().Eq("patient_id", patientID).Execute(nil)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Could not delete from flagged", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Patient Kept"))
}
