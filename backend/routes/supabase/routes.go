package supabase

import (
	"context"
	"encoding/json"
	"io"
	"math/rand/v2"
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
		IsAdmin: userRequest.IsAdmin,
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
	err := Supabase.DB.From("prescriptions").Select("*").Execute(&prescriptions)
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
	err := Supabase.DB.From("prescriptions").Select("*").Eq("id", id).Execute(&prescription)
	if err != nil {
		http.Error(w, "Prescription not found", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prescription[0])

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
	if err != nil {
		http.Error(w, "Student not found", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(student[0])
}

/*
*
  - GenerateUniqueIndices generates a list of unique random numbers
  - Helper function to generate a list of random unique numbers for indexing into patients list
  - @param count int		Number of unique numbers to generate. If this number exceeds the max range,
    the function will stop tracking unique values and continue generating
  - @param max int		Generates numbers from range[0, max), excluding max
  - @return []int		List of unique random numbers
*/
func GenerateUniqueIndices(count, max int) []int {
	uniqueNumbers := make(map[int]bool) // Set to track generated numbers
	result := make([]int, 0, count)     // List to store unique numbers

	for len(result) < count {
		if len(uniqueNumbers) >= max {
			// If we need to generate more numbers than the range, reset tracking and continue appending
			// Mostly to avoid errors, shouldn't happen in practice because there's so many patients
			uniqueNumbers = make(map[int]bool)
		}

		num := rand.IntN(max) // Generate a number
		if !uniqueNumbers[num] {
			uniqueNumbers[num] = true // Mark as seen
			result = append(result, num)
		}
	}

	return result
}

func GenerateTasks(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Generating tasks")
	// Get the number of tasks to generate from request body
	var taskCreateRequest TaskCreateRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &taskCreateRequest)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error parsing task request body", http.StatusNotFound)
		return
	}

	// TODO: Get all students, loop through each one, add a dummy task for each student for now
	var students []model.User
	err = Supabase.DB.From("users").Select("*").Eq("isAdmin", "FALSE").Execute(&students)
	if err != nil || len(students) == 0 {
		http.Error(w, "No Students Found", http.StatusNotFound)
		return
	}

	// Gets all patients from the database
	var patients []model.Patient
	err = Supabase.DB.From("patients").Select("*").Execute(&patients)
	// fmt.Println(patients)
	if err != nil || len(patients) == 0 {
		http.Error(w, "No Patients Found", http.StatusNotFound)
		return
	}

	// Assigns random index for patient per task, per student
	taskCount := taskCreateRequest.PatientTaskCount + taskCreateRequest.LabResultTaskCount + taskCreateRequest.PrescriptionTaskCount
	for _, student := range students {
		// Goal here is to make each task use a UNIQUE patient, if there aren't enough patients then it will repeat
		random_indices := GenerateUniqueIndices(taskCount, len(patients)) // The actual list of random ints
		random_index := 0                                                 // Keeps track of the current index in the random_indices list

		for i := 0; i < taskCreateRequest.PatientTaskCount; i++ {
			// Generate a patient question task
			patient_task := model.PatientTask{
				Task: model.Task{
					PatientId: patients[random_indices[random_index+i]].Id, // Little convoluted but it keeps track of the index from other loops
					UserId:    student.Id,
					TaskType:  model.PatientQuestionTaskType,
					Completed: false,
				},
				PatientQuestion: nil,
				StudentResponse: nil,
				LLMFeedback:     nil,
			}
			// TODO: Genenerate patient question using LLM, insert into task
			err = Supabase.DB.From("tasks").Insert(patient_task).Execute(nil)
			if err != nil {
				fmt.Println(err)
				http.Error(w, "Failed to insert patient question task", http.StatusInternalServerError)
				return
			}
		}
		random_index += taskCreateRequest.PatientTaskCount

		for i := 0; i < taskCreateRequest.LabResultTaskCount; i++ {
			// Generate a lab result task
			result_uuid, err := uuid.Parse("1c5b9e46-469b-4e39-b9a2-b415c59cbe04") // hardcoded for now
			if err != nil {
				fmt.Println(err)
				http.Error(w, "Failed to parse UUID", http.StatusInternalServerError)
				return
			}
			result_task := model.ResultTask{
				Task: model.Task{
					PatientId: patients[random_indices[random_index+i]].Id, // Little convoluted but it keeps track of the index from other loops
					UserId:    student.Id,
					TaskType:  model.LabResultTaskType,
					Completed: false,
				},
				ResultId:        result_uuid,
				StudentResponse: nil,
				LLMFeedback:     nil,
			}
			err = Supabase.DB.From("tasks").Insert(result_task).Execute(nil)
			if err != nil {
				fmt.Println(err)
				http.Error(w, "Failed to insert lab result task", http.StatusInternalServerError)
				return
			}
		}
		random_index += taskCreateRequest.LabResultTaskCount

		for i := 0; i < taskCreateRequest.PrescriptionTaskCount; i++ {
			// Generate a prescription task
			prescription_uuid, err := uuid.Parse("01725d72-1d2b-473f-a2ef-6b8b8ebc1102") // hardcoded for now
			if err != nil {
				fmt.Println(err)
				http.Error(w, "Failed to parse UUID", http.StatusInternalServerError)
				return
			}
			prescription_task := model.PrescriptionTask{
				Task: model.Task{
					PatientId: patients[random_indices[random_index+i]].Id, // Little convoluted but it keeps track of the index from other loops
					UserId:    student.Id,
					TaskType:  model.PrescriptionTaskType,
					Completed: false,
				},
				PrescriptionId: prescription_uuid,
			}
			err = Supabase.DB.From("tasks").Insert(prescription_task).Execute(nil)
			if err != nil {
				fmt.Println(err)
				http.Error(w, "Failed to insert prescription task", http.StatusInternalServerError)
				return
			}
		}
		random_index += taskCreateRequest.PrescriptionTaskCount // Not needed, but just in case we add more types

	}
	w.Write([]byte("Tasks generated"))

}

func GetTaskByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["task_id"]
	var task []model.Task
	err := Supabase.DB.From("tasks").Select("*").Eq("id", id).Execute(&task)
	if err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task[0])
}

func GetTasksByStudentID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["student_id"]
	var tasks []model.Task
	err := Supabase.DB.From("tasks").Select("*").Eq("user_id", id).Execute(&tasks)
	if err != nil {
		http.Error(w, "No tasks found", http.StatusNotFound)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// CompleteTask marks a task as completed
func CompleteTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["task_id"]
	var task []model.Task
	err := Supabase.DB.From("tasks").Select("*").Eq("id", id).Execute(&task)
	if err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
	}
	task[0].CompleteTask()
	err = Supabase.DB.From("tasks").Update(task[0]).Eq("id", id).Execute(nil)
	if err != nil {
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
	}
	w.Write([]byte("Task completed"))
}
