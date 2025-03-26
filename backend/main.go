package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/rs/cors"
	"gitlab.msu.edu/team-corewell-2025/routes/llm"
	"gitlab.msu.edu/team-corewell-2025/routes/supabase"
)

func main() {

	// Load env vars
	err := godotenv.Load(".env")
	if err != nil {
		fmt.Println("Error loading in .env")
	}

	// Create client
	url := os.Getenv("SUPABASE_URL")
	key := os.Getenv("SUPABASE_KEY")
	supabase.InitClient(url, key)

	// API Gateway
	m := mux.NewRouter()

	//Job Scheduler
	c := cron.New(cron.WithSeconds())
	_, err = c.AddFunc("@daily", func() {
		fmt.Println("Job Scheduler Triggered. ")
		err = supabase.GenerateTasks(3, 3, 3, false)
		if err != nil {
			fmt.Println("Error in cron job:", err)
		}
		fmt.Println("Tasks generated for the day!")
	})
	if err != nil {
		fmt.Println("Error scheduling cron job:", err)
		return
	}
	c.Start()

	// Endpoints

	// Auth
	m.HandleFunc("/addUser", supabase.SignUpUser).Methods("POST")
	m.HandleFunc("/login", supabase.SignInUser).Methods("POST")
	m.HandleFunc("/forgotPassword", supabase.ForgotPassword).Methods("POST")
	m.HandleFunc("/resetPassword", supabase.ResetPassword).Methods("POST")

	// Patients
	patientsRouter := m.PathPrefix("/patients").Subrouter()
	patientsRouter.HandleFunc("", supabase.GetPatients).Methods("GET")
	patientsRouter.HandleFunc("/{id}", supabase.GetPatientByID).Methods("GET")
	patientsRouter.HandleFunc("/{id}/prescriptions", supabase.GetPrescriptionsByPatientID).Methods("GET")
	patientsRouter.HandleFunc("/{id}/results", supabase.GetResultsByPatientID).Methods("GET")
	patientsRouter.HandleFunc("/{id}/llm-response", supabase.GetLLMResponseForPatient).Methods("GET")

	// Prescriptions
	prescriptionsRouter := m.PathPrefix("/prescriptions").Subrouter()
	prescriptionsRouter.HandleFunc("", supabase.GetPrescriptions).Methods("GET")
	prescriptionsRouter.HandleFunc("/{id}", supabase.GetPrescriptionByID).Methods("GET")

	// Students
	studentsRouter := m.PathPrefix("/students").Subrouter()
	studentsRouter.HandleFunc("", supabase.GetStudents).Methods("GET")
	studentsRouter.HandleFunc("/{id}", supabase.GetStudentById).Methods("GET")

	// Results
	resultsRouter := m.PathPrefix("/results").Subrouter()
	resultsRouter.HandleFunc("", supabase.GetResults).Methods("GET")
	resultsRouter.HandleFunc("/{id}", supabase.GetResultByID).Methods("GET")

	// Flagging Feature
	m.HandleFunc("/flaggedPatients", supabase.GetFlaggedPatients).Methods("GET")
	m.HandleFunc("/addFlag", supabase.AddFlaggedPatient).Methods("POST")
	m.HandleFunc("/removePatient", supabase.RemoveFlaggedPatient).Methods("POST")
	m.HandleFunc("/keepPatient", supabase.KeepPatient).Methods("POST")

	// Endpoints for tasks (generating, getting, completing, etc.)
	m.HandleFunc("/generateTasks", supabase.GenerateTasksHTMLWrapper).Methods("POST")
	m.HandleFunc("/{student_id}/tasks", supabase.GetTasksByStudentID).Methods("POST", "OPTIONS") //had to make this post bc the function expects a body
	//hardcoded body to show incomplete tasks ^^^
	m.HandleFunc("/{student_id}/tasks/week", supabase.GetTasksByWeekAndDay).Methods("GET")
	m.HandleFunc("/tasks/{task_id}", supabase.GetTaskByID).Methods("GET")
	m.HandleFunc("/{student_id}/tasks/{task_id}/completeTask", supabase.CompleteTask).Methods("POST")

	//Student Instructor Assignment Feature
	m.HandleFunc("/instructors", supabase.GetInstructors).Methods("GET")
	m.HandleFunc("/instructors/{id}/students", supabase.GetInstructorStudents).Methods("GET")
	m.HandleFunc("/addStudent", supabase.AddStudentToInstructor).Methods("POST")

	// Misc
	m.HandleFunc("/messageRequest", llm.RequestMessage).Methods("POST")

	// Allow API requests from frontend
	handler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}).Handler(m)

	err = http.ListenAndServe(":8060", handler)
	if err != nil {
		fmt.Println(err)
	}
}
