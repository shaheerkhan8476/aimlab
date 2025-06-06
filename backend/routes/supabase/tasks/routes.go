package tasks

import (
	"encoding/json"
	"io"
	"math/rand/v2"
	"net/http"
	"time"

	"bytes"
	"fmt"
	"strings"

	"github.com/gorilla/mux"
	supabase "github.com/nedpals/supabase-go"
	model "gitlab.msu.edu/team-corewell-2025/models"
	request "gitlab.msu.edu/team-corewell-2025/routes/supabase"
)

// LLM service URL
const llmURL = "http://127.0.0.1:5001/api/message-request"

type TaskHandler struct {
	Supabase *supabase.Client
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

// The only thing this function does is extract the number of tasks to generate from the request body
// and then calls the GenerateTasks function
func (h *TaskHandler) GenerateTasksHTMLWrapper(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Generating tasks")
	// Get the number of tasks to generate from request body
	// Example json body:
	// {
	//     "patient_task_count": 3,
	//     "lab_result_task_count": 0,
	//     "prescription_task_count": 0,
	// }
	var taskCreateRequest request.TaskCreateRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &taskCreateRequest)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error parsing task request body", http.StatusNotFound)
		return
	}

	// Run the task generation function
	// Removed generating patient question for now
	err = h.GenerateTasks(taskCreateRequest.PatientTaskCount, taskCreateRequest.LabResultTaskCount, taskCreateRequest.PrescriptionTaskCount, false)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Error generating tasks", http.StatusInternalServerError)
		return
	}

	w.Write([]byte("Tasks generated"))

}

// Does the actual generation of tasks
// This function is called by the API endpoint
func (h *TaskHandler) GenerateTasks(numQuestions int, numResults int, numPrescriptions int, generate_question bool) error {
	var students []model.User
	errLatest := error(nil) // Keeps track of the latest error, if any
	err := h.Supabase.DB.From("users").Select("*").Eq("isAdmin", "FALSE").Execute(&students)
	if err != nil || len(students) == 0 {
		fmt.Println("No students found")
		return err
	}

	// Gets all patients from the database
	var patients []model.Patient
	err = h.Supabase.DB.From("patients").Select("*").Execute(&patients)
	if err != nil || len(patients) == 0 {
		fmt.Println("No patients found")
		return err
	}

	// Assigns random index for patient per task between ALL students
	taskCount := numQuestions + numResults + numPrescriptions
	// Goal here is to make each task use a UNIQUE patient, if there aren't enough patients then it will repeat
	random_indices := GenerateUniqueIndices(taskCount*len(students), len(patients)) // The actual list of random ints
	random_index := 0                                                               // Keeps track of the current index in the random_indices list
	createdAt := time.Now()                                                         // Timestamp for task creation
	for _, student := range students {

		for i := 0; i < numQuestions; i++ {
			// Generate a patient question task
			patient_uuid := patients[random_indices[random_index+i]].Id
			var question string
			if generate_question {
				// Retrieve the patient record.
				// Retrieve prescriptions for this patient.
				var prescriptions []model.Prescription
				err = h.Supabase.DB.From("prescriptions").Select("*,patient:patients(name)").Eq("patient_id", patient_uuid.String()).Execute(&prescriptions)
				if err != nil {
					// If an error occurs, you might choose to continue with an empty list.
					prescriptions = []model.Prescription{}
				}

				// Retrieve test results for this patient.
				var results []model.Result
				err = h.Supabase.DB.From("results").Select("*,patient:patients(name)").Eq("patient_id", patient_uuid.String()).Execute(&results)
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
					fmt.Println("Error encoding combined patient data")
					return err
				}

				// Build a prompt that includes all of the data.
				prompt := fmt.Sprintf("Patient Data:\n%s\n Using this data, generate a new potential question that the patient may ask their doctor. The question should be about recent symptoms the patient has been experiencing. Respond with only the message and nothing else. Do not include the quotation marks with the message.", string(combinedJSON))

				// Create the LLM request payload.
				llmRequest := map[string]string{
					"message": prompt,
				}

				reqBody, err := json.Marshal(llmRequest)
				if err != nil {
					fmt.Println("Error encoding LLM request")
					return err
				}

				// Send the request to the LLM microservice.
				response, err := http.Post(llmURL, "application/json", bytes.NewBuffer(reqBody))
				if err != nil {
					fmt.Println("Error communicating with LLM")
					return err
				}
				defer response.Body.Close()

				body, err := io.ReadAll(response.Body)
				if err != nil {
					fmt.Println("Error reading LLM response")
					fmt.Println(err) // skip this task instead of returning
					errLatest = err
				}

				question_body := map[string]string{}
				err = json.Unmarshal(body, &question_body)
				if err != nil {
					fmt.Println("Error parsing LLM response")
					fmt.Println(err) // skip this task instead of returning
					errLatest = err
				}

				question = strings.Trim(question_body["completion"], "\"")
			} else {
				// don't generate question, just use current patient message in supabase
				question = patients[random_indices[random_index+i]].PatientMessage
			}

			patient_task := model.PatientTask{
				Task: model.Task{
					PatientId:       patient_uuid, // Little convoluted but it keeps track of the index from other loops
					UserId:          student.Id,
					TaskType:        model.PatientQuestionTaskType,
					Completed:       false,
					CreatedAt:       &createdAt,
					StudentResponse: nil, // won't be filled in until student responds
					LLMResponse:     nil, // won't be filled in until LLM provides response
					LLMFeedback:     nil, // won't be filled in until LLM provides feedback
				},
				PatientQuestion: &question, // task is generated with patient question
			}
			err = h.Supabase.DB.From("tasks").Insert(patient_task).Execute(nil)
			if err != nil {
				fmt.Println("Failed to insert patient question task")
				return err
			}
		}
		random_index += numQuestions

		for i := 0; i < numResults; i++ {
			// Generate a lab result task
			var lab_results []model.Result
			patient_uuid := patients[random_indices[random_index+i]].Id
			// patient_uuid := "30ed13d4-8d4a-44e5-8821-f05ee761c2b0" // hardcoded test uuid
			err = h.Supabase.DB.From("results").Select("*").Eq("patient_id", patient_uuid.String()).Execute(&lab_results)
			if err != nil {
				fmt.Println("Failed to get lab results for the selected patient")
				return err
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
					PatientId:       patient_uuid, // Little convoluted but it keeps track of the index from other loops
					UserId:          student.Id,
					TaskType:        model.LabResultTaskType,
					Completed:       false,
					CreatedAt:       &createdAt,
					StudentResponse: nil, // won't be filled in until student responds
					LLMResponse:     nil, // won't be filled in until LLM provides response
					LLMFeedback:     nil, // won't be filled in until LLM provides feedback
				},
				ResultId: result_uuid,
			}
			err = h.Supabase.DB.From("tasks").Insert(result_task).Execute(nil)
			if err != nil {
				fmt.Println("Failed to insert lab result task")
				return err
			}
		}
		random_index += numResults

		for i := 0; i < numPrescriptions; i++ {
			// Generate a prescription task
			var prescriptions []model.Prescription
			patient_uuid := patients[random_indices[random_index+i]].Id
			err = h.Supabase.DB.From("prescriptions").Select("*").Eq("patient_id", patient_uuid.String()).Execute(&prescriptions)
			if err != nil {
				fmt.Println("Failed to get prescriptions for the selected patient")
				return err
			}
			if len(prescriptions) == 0 {
				// Avoids errors, shouldn't happen in practice because each patient has at least one prescription
				fmt.Println("No prescriptions found for patient, skipping this task")
				continue
			}
			prescription_uuid := prescriptions[rand.IntN(len(prescriptions))].ID // Picks a random prescription from the patient

			prescription_task := model.PrescriptionTask{
				Task: model.Task{
					PatientId:       patient_uuid, // Little convoluted but it keeps track of the index from other loops
					UserId:          student.Id,
					TaskType:        model.PrescriptionTaskType,
					Completed:       false,
					CreatedAt:       &createdAt,
					StudentResponse: nil, // won't be filled in until student responds
					LLMResponse:     nil, // won't be filled in until LLM provides response
					LLMFeedback:     nil, // won't be filled in until LLM provides feedback
				},
				PrescriptionId: prescription_uuid,
			}
			err = h.Supabase.DB.From("tasks").Insert(prescription_task).Execute(nil)
			if err != nil {
				fmt.Println("Failed to insert prescription task")
				return err
			}
		}
		random_index += numPrescriptions // Not needed, but just in case we add more types
	}
	if errLatest != nil {
		fmt.Println("One or more tasks failed to generate, but continuing")
		return errLatest // return the error if one or more tasks failed to generate
	} else {
		fmt.Println("All tasks generated successfully")
		return nil // no errors
	}
}

// Helper function for getting the entire task (including specific task type parts)
// Takes a list of tasks (output from Supabase query), returns the list of full tasks
// Note: Full tasks only used in detailed task view (GetTaskByID, GetTasksByStudentID), not in overall task list view (GetTasksByWeekAndDay)
func (h *TaskHandler) GetFullTasks(tasks []model.Task) ([]interface{}, error) {
	fullTasks := make([]interface{}, 0)
	for _, task := range tasks {
		switch task.TaskType {
		case "patient_question":
			var patientTask []model.PatientTask
			err := h.Supabase.DB.From("tasks").Select("*").Eq("id", task.Id.String()).Execute(&patientTask)
			if err == nil {
				fullTasks = append(fullTasks, patientTask[0])
			} else {
				fmt.Println(err)
				return nil, err
			}
		case "lab_result":
			var labResult []model.ResultTask
			err := h.Supabase.DB.From("tasks").Select("*").Eq("id", task.Id.String()).Execute(&labResult)
			if err == nil {
				fullTasks = append(fullTasks, labResult[0])
			} else {
				fmt.Println(err)
				return nil, err
			}
		case "prescription":
			var prescription []model.PrescriptionTask
			err := h.Supabase.DB.From("tasks").Select("*").Eq("id", task.Id.String()).Execute(&prescription)
			if err == nil {
				fullTasks = append(fullTasks, prescription[0])
			} else {
				fmt.Println(err)
				return nil, err
			}
		}
	}
	return fullTasks, nil
}

// Helper function for getting rid of null values from an interface slice
// Useful for cleaning up the marshaled output from Supabase query --> interface (instead of struct)
// Currently not being used, I'm adding it just in case
func removeNullsFromSlice(data []interface{}) []interface{} {
	cleanedSlice := make([]interface{}, 0)

	for _, item := range data {
		if itemMap, ok := item.(map[string]interface{}); ok {
			cleanedMap := make(map[string]interface{})
			for key, value := range itemMap {
				if value != nil { // Only add non-nil values
					cleanedMap[key] = value
				}
			}
			cleanedSlice = append(cleanedSlice, cleanedMap)
		} else {
			// If it's not a map[string]interface{}, just add it as is
			cleanedSlice = append(cleanedSlice, item)
		}
	}
	return cleanedSlice
}

// Gets a singular task by ID
// The URL contains the task ID
// Contains the full task (including specific task type parts)
func (h *TaskHandler) GetTaskByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["task_id"]
	var task []model.Task
	err := h.Supabase.DB.From("tasks").Select("*").Eq("id", id).Execute(&task)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	// Gets the full task
	fullTask, err := h.GetFullTasks(task)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Full Task not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fullTask[0])
}

// This function gets all the tasks for a student
// The URL contains the student ID
// The request body tells the function which type of tasks to get (completed or incomplete)
func (h *TaskHandler) GetTasksByStudentID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["student_id"]

	//necessary to enable cors
	(w).Header().Set("Access-Control-Allow-Origin", "*")
	(w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

	// Get the request body
	// Example request body:
	// {
	// 	"get_incomplete_tasks": true,
	// 	"get_complete_tasks": false
	// }
	var taskGetRequest request.TaskGetRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &taskGetRequest)
	if err != nil {
		http.Error(w, "Cannot Unmarshal task request from request", http.StatusBadRequest)
		return
	}

	var tasks []model.Task // Holds the tasks to be returned
	if *taskGetRequest.GetCompleteTasks {
		var queryOutput []model.Task
		err = h.Supabase.DB.From("tasks").Select("*").Eq("user_id", id).Eq("completed", "TRUE").Execute(&queryOutput)
		if err != nil {
			http.Error(w, "No completed tasks found", http.StatusNotFound)
		}
		tasks = append(tasks, queryOutput...) // Adds query output to list of tasks
	}
	if *taskGetRequest.GetIncompleteTasks {
		var queryOutput []model.Task
		err = h.Supabase.DB.From("tasks").Select("*").Eq("user_id", id).Eq("completed", "FALSE").Execute(&queryOutput)
		if err != nil {
			http.Error(w, "No incomplete tasks found", http.StatusNotFound)
		}
		tasks = append(tasks, queryOutput...) // Adds query output to list of tasks
	}

	if len(tasks) == 0 {
		http.Error(w, "No tasks found", http.StatusNotFound)
		return
	}

	// Get the full tasks for the entire list
	fullTasks, err := h.GetFullTasks(tasks)
	if err != nil {
		http.Error(w, "Failed to get full tasks", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(fullTasks)
}

// Helper function to insert NULL into supabase when string is empty instead of empty string
func NilIfEmptyString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// CompleteTask marks a task as completed and fills in information for the task from the request body
// The URL contains the task ID
func (h *TaskHandler) CompleteTask(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["task_id"]

	// Finds the task
	var task []model.Task
	err := h.Supabase.DB.From("tasks").Select("*").Eq("id", id).Execute(&task)
	if err != nil || len(task) == 0 {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	// All tasks have a student response and LLM feedback
	var taskCompleteRequest request.TaskCompleteRequest
	// Get the request body
	// Example request body:
	// {
	// 	"student_response": "The student's response to the task",
	//  "llm_response": "The LLM's sample response to the task",
	// 	"llm_feedback": "The LLM's feedback to the student response"
	// }
	bodyBytes, _ := io.ReadAll(r.Body)
	err = json.Unmarshal(bodyBytes, &taskCompleteRequest)
	if err != nil {
		http.Error(w, "Cannot Unmarshal task completion request from request", http.StatusBadRequest)
		return
	}

	// Update the fields for the task
	updateData := map[string]interface{}{
		"completed":        true,
		"student_response": taskCompleteRequest.StudentResponse,
		"llm_response":     taskCompleteRequest.LLMResponse,
		"llm_feedback":     taskCompleteRequest.LLMFeedback,
		"completed_at":     time.Now(),
	}

	// Update DB
	err = h.Supabase.DB.From("tasks").Update(updateData).Eq("id", id).Execute(nil)
	if err != nil {
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
		return
	}
	w.Write([]byte("Task completed"))
}

// GetTasksByWeekAndDay gets all the tasks for a student and sorts them by week and day
// The URL contains the student ID
// Also includes the student's completion rate for each week
func (h *TaskHandler) GetTasksByWeekAndDay(w http.ResponseWriter, r *http.Request) {
	// Example output:
	// [
	//	{
	//	    "Week": 0,
	//	    "Days": [
	//	        {
	//	            "Day": 0,
	//	            "Tasks": [
	//	                {
	//	                    "id": "bd6acf0c-2e88-4c9f-bfe2-342919e538d6",
	//	                    "created_at": "2025-03-14T00:04:31.372774Z",
	//	                    "patient_id": "1f1d78f4-345b-48d7-9045-8baa6b6e070a",
	//	                    "user_id": "b66e3169-2335-48f8-a43f-e4730c053ad8",
	//	                    "task_type": "patient_question",
	//	                    "completed": false
	//	                },
	//	            ],
	//	            "CompletionRate": 0
	//			}
	//			],
	//			"CompletionRate": 0
	//		}
	// ]

	// Get the student ID and week number from the URL
	vars := mux.Vars(r)
	id := vars["student_id"]

	// Get all the tasks for the student
	var tasks []model.Task
	err := h.Supabase.DB.From("tasks").Select("*").Eq("user_id", id).Execute(&tasks)
	if err != nil || len(tasks) == 0 {
		http.Error(w, "No tasks found", http.StatusNotFound)
		return
	}

	// Gets the bounds (earliest and latest week) for counting by week
	startDate := time.Now() // Latest date (in theory)
	endDate := time.Time{}  // Earliest possible date
	for _, task := range tasks {
		if task.CreatedAt.Before(startDate) {
			startDate = *task.CreatedAt
		}
		if task.CreatedAt.After(endDate) {
			endDate = *task.CreatedAt
		}
	}

	// Struct to store info per day (tasks, completion rate)
	type DayPackage struct {
		Day            int          // Day number
		Tasks          []model.Task // List of tasks for the day
		CompletionRate float64      // Percentage of completed tasks
	}

	// Struct to store info for each week
	type WeekPackage struct {
		Week           int          // Week number
		Days           []DayPackage // List of Days in the week
		CompletionRate float64      // Percentage of completed tasks
	}

	// List of weeks
	weekList := make([]WeekPackage, 0)
	numWeeks := int(endDate.Sub(startDate).Hours() / (24 * 7)) // Number of weeks between the two dates
	numWeeks++                                                 // Add one to include the last week
	numDays := int(endDate.Sub(startDate).Hours() / 24)        // Number of days between the two dates
	// fmt.Println(numWeeks)

	// Initialize the list of weeks with empty days
	for i := 0; i < numWeeks; i++ {
		// Add each week
		weekList = append(weekList, WeekPackage{Week: i, Days: []DayPackage{}, CompletionRate: 0})

		// Add each day
		if i < numWeeks-1 {
			// Full week
			for j := 0; j < 7; j++ {
				weekList[i].Days = append(weekList[i].Days, DayPackage{Day: j, Tasks: []model.Task{}, CompletionRate: 0})
			}
		} else {
			// Last week may not have all days, cutoff early if so
			for j := 0; j <= numDays%7; j++ {
				weekList[i].Days = append(weekList[i].Days, DayPackage{Day: j, Tasks: []model.Task{}, CompletionRate: 0})
			}
		}
	}

	// Loop through each task to categorize it by week
	for _, task := range tasks {
		// Calculate the number of weeks since the start date
		weekNumber := int(task.CreatedAt.Sub(startDate).Hours() / (24 * 7)) // Week difference
		dayNumber := int(task.CreatedAt.Sub(startDate).Hours()/24) % 7      // Day of the week (0-6)

		for i := range weekList {
			for j := range weekList[i].Days {
				if weekList[i].Week == weekNumber && j == dayNumber {
					weekList[i].Days[j].Tasks = append(weekList[i].Days[j].Tasks, task)
				}
			}
		}
	}

	// Calculate the completion rate for each week + day
	if len(weekList) > 0 {
		for i, week := range weekList {
			completedTasksWeekly := 0
			totalTasksWeekly := 0
			for j, day := range week.Days {
				if len(day.Tasks) > 0 {
					completedTasksDaily := 0
					for _, task := range day.Tasks {
						totalTasksWeekly++
						if task.Completed {
							completedTasksDaily++
							completedTasksWeekly++
						}
					}
					weekList[i].Days[j].CompletionRate = float64(completedTasksDaily) / float64(len(day.Tasks)) * 100
				} else {
					// Avoids errors in case the day does not have any tasks (should not be possible)
					weekList[i].Days[j].CompletionRate = 0
				}

			}
			weekList[i].CompletionRate = float64(completedTasksWeekly) / float64(totalTasksWeekly) * 100
		}
	} else {
		// No tasks (meaning no weeks), so no completion rate
		// Shouldn't get to this point because we already checked for tasks
		http.Error(w, "No tasks found", http.StatusNotFound)
	}

	w.Header().Set("Content-Type", "application/json")
	// err = json.NewEncoder(w).Encode(response)
	err = json.NewEncoder(w).Encode(weekList)
	if err != nil {
		fmt.Println(err)
		http.Error(w, "Failed to encode response when getting tasks grouped chronologically", http.StatusInternalServerError)
	}
}
