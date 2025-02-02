package supabase

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"fmt"

	"github.com/google/uuid"
	supabase "github.com/nedpals/supabase-go"
	model "gitlab.msu.edu/team-corewell-2025/models"
)

var Supabase *supabase.Client

func InitClient(url, key string) *supabase.Client {
	Supabase = supabase.CreateClient(url, key)
	return Supabase
}

func SignUpUser(w http.ResponseWriter, r *http.Request) {
	var userRequest UserCreateRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &userRequest)
	if err != nil {
		print(err)
	}
	ctx := context.Background()
	user, err := Supabase.Auth.SignUp(ctx, supabase.UserCredentials{
		Email:    userRequest.Email,
		Password: userRequest.Password,
	})
	if err != nil {
		print(err)
	}
	parsedID, err := uuid.Parse(user.ID)
	if err != nil {
		print(err)
	}
	newUser := model.User{
		Id:      parsedID,
		Name:    userRequest.Name,
		Email:   userRequest.Email,
		IsAdmin: false,
	}
	err = Supabase.DB.From("users").Insert(newUser).Execute(nil)
	if err != nil {
		print(err)
	}
	b, err := json.Marshal(user)
	if err != nil {
		print("Error", err)
	}
	w.Write(b)
}
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

/**
 * GetPatientByID fetches a patient by ID from the database
 * @param w http.ResponseWriter
 * @param r *http.Request
 */
func GetPatients(w http.ResponseWriter, r *http.Request) {
	var request map[string]interface{}
	var patients []model.Patient
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		fmt.Println("Error reading request body:", err)
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	err = json.Unmarshal(bodyBytes, &request)
	if err != nil {
		fmt.Println("Error unmarshaling JSON:", err)
		http.Error(w, "Failed to parse request body", http.StatusBadRequest)
		return
	}
	err = Supabase.DB.From("patients").Select("*").Execute(&patients)

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
