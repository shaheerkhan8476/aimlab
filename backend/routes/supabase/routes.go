package supabase

import (
	"context"
	"encoding/json"
	"io"
	"math/rand/v2"
	"net/http"
	"time"

	"bytes"
	"fmt"
	"strings"

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

	// TODO: Store response in Supabase for later retrieval.
	// Problem: How do we get associated task for this call?
	// Might have to redirect route from main to the associated task (instead of generic patient page), which calls this function and then stores the response

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
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
	// Example json body:
	// {
	//     "patient_task_count": 3,
	//     "lab_result_task_count": 0,
	//     "prescription_task_count": 0,
	//     "generate_question": false
	// }
	var taskCreateRequest TaskCreateRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &taskCreateRequest)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error parsing task request body", http.StatusNotFound)
		return
	}

	var students []model.User
	err = Supabase.DB.From("users").Select("*").Eq("isAdmin", "FALSE").Execute(&students)
	if err != nil || len(students) == 0 {
		http.Error(w, "No Students Found", http.StatusNotFound)
		return
	}

	// Gets all patients from the database
	var patients []model.Patient
	err = Supabase.DB.From("patients").Select("*").Execute(&patients)
	if err != nil || len(patients) == 0 {
		http.Error(w, "No Patients Found", http.StatusNotFound)
		return
	}

	// Assigns random index for patient per task between ALL students
	taskCount := taskCreateRequest.PatientTaskCount + taskCreateRequest.LabResultTaskCount + taskCreateRequest.PrescriptionTaskCount
	// Goal here is to make each task use a UNIQUE patient, if there aren't enough patients then it will repeat
	random_indices := GenerateUniqueIndices(taskCount*len(students), len(patients)) // The actual list of random ints
	random_index := 0                                                               // Keeps track of the current index in the random_indices list
	generate_question := taskCreateRequest.GenerateQuestion                         // Whether or not to generate new patient questions on the spot
	for _, student := range students {

		for i := 0; i < taskCreateRequest.PatientTaskCount; i++ {
			// Generate a patient question task
			patient_uuid := patients[random_indices[random_index+i]].Id
			var question string
			if generate_question {
				// Retrieve the patient record.
				// Retrieve prescriptions for this patient.
				var prescriptions []model.Prescription
				err = Supabase.DB.From("prescriptions").Select("*,patient:patients(name)").Eq("patient_id", patient_uuid.String()).Execute(&prescriptions)
				if err != nil {
					// If an error occurs, you might choose to continue with an empty list.
					prescriptions = []model.Prescription{}
				}

				// Retrieve test results for this patient.
				var results []model.Result
				err = Supabase.DB.From("results").Select("*,patient:patients(name)").Eq("patient_id", patient_uuid.String()).Execute(&results)
				if err != nil {
					results = []model.Result{}
				}

				// Combine the patient, prescriptions, and results into one object.
				combinedData := map[string]interface{}{
					"patient":       patients[random_indices[random_index+i]],
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
				prompt := fmt.Sprintf("Patient Data:\n%s\n Ignore the \"patient_message\" data. Assume that this patient is part of a basket management system for family medicine. Pretend that you are the patient, who is asking their doctor about recent symptoms they are having. Respond with only the message and nothing else. Do not include the quotation marks with the message.", string(combinedJSON))

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

				question_body := map[string]string{}
				err = json.Unmarshal(body, &question_body)
				if err != nil {
					http.Error(w, "Error parsing LLM response", http.StatusInternalServerError)
					return
				}

				question = strings.Trim(question_body["completion"], "\"")
			} else {
				// don't generate question, just use current patient message in supabase
				question = patients[random_indices[random_index+i]].PatientMessage
			}

			patient_task := model.PatientTask{
				Task: model.Task{
					PatientId: patient_uuid, // Little convoluted but it keeps track of the index from other loops
					UserId:    student.Id,
					TaskType:  model.PatientQuestionTaskType,
					Completed: false,
				},
				PatientQuestion: &question, // task is generated with patient question
				StudentResponse: nil,       // won't be filled in until student responds
				LLMFeedback:     nil,       // won't be filled in until LLM provides feedback
			}
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
			var lab_results []model.Result
			patient_uuid := patients[random_indices[random_index+i]].Id
			// patient_uuid := "30ed13d4-8d4a-44e5-8821-f05ee761c2b0" // hardcoded test uuid
			err = Supabase.DB.From("results").Select("*").Eq("patient_id", patient_uuid.String()).Execute(&lab_results)
			if err != nil {
				fmt.Println(err)
				http.Error(w, "Failed to get lab results for the selected patient", http.StatusInternalServerError)
				return
			}
			if len(lab_results) == 0 {
				// Avoids errors, shouldn't happen in practice because each patient has at least one lab result
				fmt.Println("No lab results found for patient, skipping this task")
				continue
			}
			result_uuid := lab_results[rand.IntN(len(lab_results))].ID // Picks a random lab result from the patient
			// result_uuid, err := uuid.Parse("3df2a391-dd2b-4f60-9b1b-00c6a4897396") // hardcoded test uuid
			result_task := model.ResultTask{
				Task: model.Task{
					PatientId: patient_uuid, // Little convoluted but it keeps track of the index from other loops
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
			var prescriptions []model.Prescription
			patient_uuid := patients[random_indices[random_index+i]].Id
			err = Supabase.DB.From("prescriptions").Select("*").Eq("patient_id", patient_uuid.String()).Execute(&prescriptions)
			if err != nil {
				fmt.Println(err)
				http.Error(w, "Failed to get prescriptions for the selected patient", http.StatusInternalServerError)
				return
			}
			if len(prescriptions) == 0 {
				// Avoids errors, shouldn't happen in practice because each patient has at least one prescription
				fmt.Println("No prescriptions found for patient, skipping this task")
				continue
			}
			prescription_uuid := prescriptions[rand.IntN(len(prescriptions))].ID // Picks a random prescription from the patient

			prescription_task := model.PrescriptionTask{
				Task: model.Task{
					PatientId: patient_uuid, // Little convoluted but it keeps track of the index from other loops
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

// This function gets all the tasks for a student
// The URL contains the student ID
// The request body tells the function which type of tasks to get (completed or incomplete)
func GetTasksByStudentID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["student_id"]

	// Get the request body
	// Example request body:
	// {
	// 	"get_incomplete_tasks": true,
	// 	"get_complete_tasks": false
	// }
	var taskGetRequest TaskGetRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &taskGetRequest)
	if err != nil {
		http.Error(w, "Cannot Unmarshal task request from request", http.StatusBadRequest)
		return
	}

	var tasks []model.Task // Holds the tasks to be returned
	if *taskGetRequest.GetCompleteTasks {
		var queryOutput []model.Task
		err = Supabase.DB.From("tasks").Select("*").Eq("user_id", id).Eq("completed", "TRUE").Execute(&queryOutput)
		if err != nil {
			http.Error(w, "No completed tasks found", http.StatusNotFound)
		}
		tasks = append(tasks, queryOutput...) // Adds query output to list of tasks
	}
	if *taskGetRequest.GetIncompleteTasks {
		var queryOutput []model.Task
		err = Supabase.DB.From("tasks").Select("*").Eq("user_id", id).Eq("completed", "FALSE").Execute(&queryOutput)
		if err != nil {
			http.Error(w, "No incomplete tasks found", http.StatusNotFound)
		}
		tasks = append(tasks, queryOutput...) // Adds query output to list of tasks
	}

	if len(tasks) == 0 {
		http.Error(w, "No tasks found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tasks)
}

// CompleteTask only marks a task as completed
func CompleteTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["task_id"]

	// Finds the task
	var task []model.Task
	err := Supabase.DB.From("tasks").Select("*").Eq("id", id).Execute(&task)
	if err != nil || len(task) == 0 {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	// Update only the completed field
	updateData := map[string]interface{}{
		"completed": true,
	}

	// Update DB
	err = Supabase.DB.From("tasks").Update(updateData).Eq("id", id).Execute(nil)
	if err != nil {
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
		return
	}
	w.Write([]byte("Task completed"))
}

// GetTaskByWeek gets all the tasks for a student and sorts them by week
// The URL contains the student ID
func GetTaskByWeek(w http.ResponseWriter, r *http.Request) {
	// Get the student ID and week number from the URL
	vars := mux.Vars(r)
	id := vars["student_id"]

	// Get all the tasks for the student
	var tasks []model.Task
	err := Supabase.DB.From("tasks").Select("*").Eq("user_id", id).Execute(&tasks)
	if err != nil {
		http.Error(w, "No tasks found", http.StatusNotFound)
		return
	}

	// Start date for counting by week
	// Gets the earliest task created date
	startDate := time.Now()
	for _, task := range tasks {
		if task.CreatedAt.Before(startDate) {
			startDate = *task.CreatedAt
		}
	}

	// Map to store tasks by week
	// key = week number (int), value = list of tasks for that week
	weekTasks := make(map[int][]model.Task)

	// Loop through each task to categorize it by week
	for _, task := range tasks {
		// Calculate the number of weeks since the start date
		weekNumber := int(task.CreatedAt.Sub(startDate).Hours() / (24 * 7)) // Week difference

		// Add the task to the corresponding week
		weekTasks[weekNumber] = append(weekTasks[weekNumber], task)
	}

	// The output response
	response := make([]map[string]interface{}, 0)

	// Convert weekTasks map to slice of week objects
	for week, tasksInWeek := range weekTasks {
		weekData := map[string]interface{}{
			"week":  week,
			"tasks": tasksInWeek,
		}
		response = append(response, weekData)
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(response)
	if err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
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
