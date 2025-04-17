package supabase

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"fmt"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	supabase "github.com/nedpals/supabase-go"
	model "gitlab.msu.edu/team-corewell-2025/models"
)

var Supabase *supabase.Client

// Initializes the Database client
func InitClient(url, key string) *supabase.Client {
	Supabase = supabase.CreateClient(url, key)
	return Supabase
}

// Signs up the user
func SignUpUser(w http.ResponseWriter, r *http.Request) {
	var userRequest UserCreateRequest
	bodyBytes, err := io.ReadAll(r.Body)

	if err != nil {
		msg := fmt.Sprintf("SignUpUser: failed to read request body: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest) // 400
		return
	}
	err = json.Unmarshal(bodyBytes, &userRequest)
	if err != nil {
		msg := fmt.Sprintf("SignUpUser: cannot unmarshal user from request: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest) // 400
		return
	}
	ctx := context.Background()
	user, err := Supabase.Auth.SignUp(ctx, supabase.UserCredentials{
		Email:    userRequest.Email,
		Password: userRequest.Password,
	})
	if err != nil {
		msg := fmt.Sprintf("Supabase Sign Up Error: %v", err)
		fmt.Println(msg)
		http.Error(w, "Sign Up User Error", http.StatusNotAcceptable)
		return
	}
	parsedID, err := uuid.Parse(user.ID)
	if err != nil {
		msg := fmt.Sprintf("SignUpUser: cannot parse user.ID as UUID (%s): %v", user.ID, err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest) // 400
		return
	}
	newUser := model.User{
		Id:              parsedID,
		Name:            userRequest.Name,
		Email:           userRequest.Email,
		IsAdmin:         userRequest.IsAdmin,
		StudentStanding: &userRequest.StudentStanding,
	}
	err = Supabase.DB.From("users").Insert(newUser).Execute(nil)
	if err != nil {
		msg := fmt.Sprintf("SignUpUser: insert to DB failed, possibly conflict: %v", err)
		fmt.Println(msg)
		http.Error(w, "User has already been created", http.StatusConflict) // 409
		return
	}
	b, err := json.Marshal(user)
	if err != nil {
		msg := fmt.Sprintf("SignUpUser: error marshaling supabase user response: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusInternalServerError) // 500
		return
	}
	w.Write(b)
}

// Signs in the user
func SignInUser(w http.ResponseWriter, r *http.Request) {
	var userRequest UserLoginRequest
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		msg := fmt.Sprintf("SignInUser: failed to read request body: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	err = json.Unmarshal(bodyBytes, &userRequest)
	if err != nil {
		msg := fmt.Sprintf("SignInUser: failed to Unmarshal request body: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	ctx := context.Background()
	user, err := Supabase.Auth.SignIn(ctx, supabase.UserCredentials{
		Email:    userRequest.Email,
		Password: userRequest.Password,
	})
	if err != nil {
		msg := fmt.Sprintf("Supabase Sign In Error: %v", err)
		fmt.Println(msg)
		http.Error(w, "Sign In User Error", http.StatusNotAcceptable)
		return
	}
	Supabase.DB.AddHeader("Authorization", "Bearer "+user.AccessToken)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var ForgotPasswordRequest ForgotPasswordRequest
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		msg := fmt.Sprintf("Error Reading Forgot Password Request Body: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	err = json.Unmarshal(bodyBytes, &ForgotPasswordRequest)
	if err != nil {
		msg := fmt.Sprintf("ForgotPassword: cannot unmarshal request body: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest) // 400
		return
	}
	ctx := context.Background()
	err = Supabase.Auth.ResetPasswordForEmail(ctx, ForgotPasswordRequest.Email, "http://localhost:3000/reset-password")
	if err != nil {
		msg := fmt.Sprintf("ForgotPassword: ResetPasswordForEmail failed: %v", err)
		fmt.Println(msg)
		http.Error(w, "Failed to send reset password", http.StatusInternalServerError) // 500
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Reset password link sent (if email is valid)"))
}

func ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		msg := fmt.Sprintf("ResetPassword: cannot parse request: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest) // 400
		return
	}
	ctx := context.Background()
	err = ResetUserPassword(ctx, Supabase, req.AccessToken, req.NewPassword)
	if err != nil {
		msg := fmt.Sprintf("ResetPassword: error resetting user password: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusInternalServerError) // 500
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Password updated successfully"))
}
func ResetUserPassword(ctx context.Context, supabaseClient *supabase.Client, accessToken string, newPassword string) error {
	user, err := supabaseClient.Auth.User(ctx, accessToken)
	if err != nil {
		return err
	}

	if user == nil || user.ID == "" {
		fmt.Println("User Not Found")
	}
	_, err = supabaseClient.Auth.UpdateUser(ctx, accessToken, map[string]interface{}{
		"password": newPassword,
	})
	return err
}

func GetStudents(w http.ResponseWriter, r *http.Request) {
	var students []model.User
	err := Supabase.DB.From("users").Select("*").Eq("isAdmin", "FALSE").Execute(&students)
	if err != nil {
		http.Error(w, "No Students Found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(students)
}

func GetStudentById(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	var student []model.User
	err := Supabase.DB.From("users").Select("*").Eq("id", id).Execute(&student)
	if err != nil {
		msg := fmt.Sprintf("GetStudents: DB error: %v", err)
		fmt.Println(msg)
		http.Error(w, "No Students Found", http.StatusNotFound)
		return
	}
	if len(student) == 0 {
		http.Error(w, "No Students Found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(student[0])
}

func GetInstructors(w http.ResponseWriter, r *http.Request) {
	var instructors []model.User
	err := Supabase.DB.From("users").Select("*").Eq("isAdmin", "TRUE").Execute(&instructors)
	if err != nil {
		msg := fmt.Sprintf("GetInstructors: DB error: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusNotFound)
		return
	}

	if len(instructors) == 0 {
		http.Error(w, "No Instructors Found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(instructors)
}

func AddStudentToInstructor(w http.ResponseWriter, r *http.Request) {
	var req AddStudentRequest
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		msg := fmt.Sprintf("AddStudentToInstructor: failed to read request body: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest)
		return
	}
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		msg := fmt.Sprintf("AddStudentToInstructor: invalid JSON: %v", err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	instructorID, err := uuid.Parse(req.InstructorId)
	if err != nil {
		http.Error(w, "Invalid instructor UUID", http.StatusBadRequest)
		return
	}
	studentID, err := uuid.Parse(req.StudentId)
	if err != nil {
		msg := fmt.Sprintf("AddStudentToInstructor: invalid instructor UUID (%s): %v", req.InstructorId, err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusBadRequest)
		return
	}

	var instructorsFound []model.User
	err = Supabase.DB.From("users").
		Select("*").
		Eq("id", instructorID.String()).
		Execute(&instructorsFound)

	if err != nil {
		msg := fmt.Sprintf("AddStudentToInstructor: error fetching instructor (id=%s): %v", instructorID.String(), err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusInternalServerError)
		return
	}
	if len(instructorsFound) == 0 {
		http.Error(w, "Instructor not found", http.StatusNotFound)
		return
	}

	instructor := instructorsFound[0]
	if !instructor.IsAdmin {
		http.Error(w, "User is not an instructor", http.StatusForbidden)
		return
	}

	for _, s := range instructor.Students {
		if s == studentID {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Student already assigned"))
			return
		}
	}
	instructor.Students = append(instructor.Students, studentID)

	updateData := map[string]any{
		"students": instructor.Students,
	}
	err = Supabase.DB.From("users").
		Update(updateData).
		Eq("id", instructor.Id.String()).
		Execute(nil)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error updating instructor", http.StatusInternalServerError)
		return
	}
	updateData = map[string]any{
		"isAssigned": true,
	}
	err = Supabase.DB.From("users").
		Update(updateData).
		Eq("id", studentID.String()).
		Execute(nil)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error updating student isAssigned", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Student Added to Instructor"))
}

func GetInstructorStudents(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	instructorID := vars["id"]
	fmt.Println(&instructorID)
	instructorUUID, err := uuid.Parse(instructorID)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Invalid instructor UUID", http.StatusBadRequest)
		return
	}

	var instructorsFound []model.User
	err = Supabase.DB.From("users").
		Select("*").
		Eq("id", instructorUUID.String()).
		Execute(&instructorsFound)
	if err != nil {
		msg := fmt.Sprintf("GetInstructorStudents: DB error (id=%s): %v", instructorUUID.String(), err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusInternalServerError)
		return
	}
	if len(instructorsFound) == 0 {
		http.Error(w, "Instructor not found", http.StatusNotFound)
		return
	}

	instructor := instructorsFound[0]
	if !instructor.IsAdmin {
		http.Error(w, "User is not an instructor", http.StatusForbidden)
		return
	}

	if len(instructor.Students) == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	var studentIDStrings []string
	for _, student_id := range instructor.Students {
		studentIDStrings = append(studentIDStrings, student_id.String())
	}

	var students []model.User
	err = Supabase.DB.From("users").
		Select("*").
		In("id", studentIDStrings).
		Execute(&students)

	if err != nil {
		msg := fmt.Sprintf("GetInstructorStudents: error fetching students for IDs=%v: %v", studentIDStrings, err)
		fmt.Println(msg)
		http.Error(w, msg, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(students)
}
