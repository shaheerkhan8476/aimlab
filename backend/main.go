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
	patients "gitlab.msu.edu/team-corewell-2025/routes/supabase/patients"
	prescriptions "gitlab.msu.edu/team-corewell-2025/routes/supabase/prescriptions"
	results "gitlab.msu.edu/team-corewell-2025/routes/supabase/results"
	tasks "gitlab.msu.edu/team-corewell-2025/routes/supabase/tasks"
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
	supa := supabase.InitClient(url, key)

	// Dependency Injection
	var ph patients.PatientService = &patients.PatientHandler{Supabase: supa}
	var prh prescriptions.PrescriptionService = &prescriptions.PrescriptionHandler{Supabase: supa}
	var rh results.ResultService = &results.ResultHandler{Supabase: supa}
	var th tasks.TaskService = &tasks.TaskHandler{Supabase: supa}

	// API Gateway
	m := mux.NewRouter()

	//Job Scheduler
	c := cron.New(cron.WithSeconds())
	_, err = c.AddFunc("@daily", func() {
		fmt.Println("Job Scheduler Triggered. ")
		err = th.GenerateTasks(3, 3, 3, false)
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


	// Auth
	m.HandleFunc("/addUser", supabase.SignUpUser).Methods("POST")
	m.HandleFunc("/login", supabase.SignInUser).Methods("POST")
	m.HandleFunc("/forgotPassword", supabase.ForgotPassword).Methods("POST")
	m.HandleFunc("/resetPassword", supabase.ResetPassword).Methods("POST")

	// Patients
	patientsRouter := m.PathPrefix("/patients").Subrouter()
	patientsRouter.HandleFunc("", ph.GetPatients).Methods("GET")
	patientsRouter.HandleFunc("/{id}", ph.GetPatientByID).Methods("GET")
	patientsRouter.HandleFunc("/{id}/prescriptions", prh.GetPrescriptionsByPatientID).Methods("GET")
	patientsRouter.HandleFunc("/{id}/results", rh.GetResultsByPatientID).Methods("GET")
	patientsRouter.HandleFunc("/{id}/llm-response", llm.PostLLMResponseForPatient).Methods("POST")

	// Flagging Feature
	m.HandleFunc("/flaggedPatients", ph.GetFlaggedPatients).Methods("GET")
	m.HandleFunc("/addFlag", ph.AddFlaggedPatient).Methods("POST")
	m.HandleFunc("/removePatient", ph.RemoveFlaggedPatient).Methods("POST")
	m.HandleFunc("/keepPatient", ph.KeepPatient).Methods("POST")

	// Prescriptions
	prescriptionsRouter := m.PathPrefix("/prescriptions").Subrouter()
	prescriptionsRouter.HandleFunc("", prh.GetPrescriptions).Methods("GET")
	prescriptionsRouter.HandleFunc("/{id}", prh.GetPrescriptionByID).Methods("GET")

	// Students
	studentsRouter := m.PathPrefix("/students").Subrouter()
	studentsRouter.HandleFunc("", supabase.GetStudents).Methods("GET")
	studentsRouter.HandleFunc("/{id}", supabase.GetStudentById).Methods("GET")

	// Results
	resultsRouter := m.PathPrefix("/results").Subrouter()
	resultsRouter.HandleFunc("", rh.GetResults).Methods("GET")
	resultsRouter.HandleFunc("/{id}", rh.GetResultByID).Methods("GET")

	// Endpoints for tasks (generating, getting, completing, etc.)
	m.HandleFunc("/generateTasks", th.GenerateTasksHTMLWrapper).Methods("POST")
	m.HandleFunc("/{student_id}/tasks", th.GetTasksByStudentID).Methods("POST", "OPTIONS") //had to make this post bc the function expects a body
	//hardcoded body to show incomplete tasks ^^^
	m.HandleFunc("/{student_id}/tasks/week", th.GetTasksByWeekAndDay).Methods("GET")
	m.HandleFunc("/{student_id}/tasks/{task_id}", th.GetTaskByID).Methods("GET")
	m.HandleFunc("/{student_id}/tasks/{task_id}/completeTask", th.CompleteTask).Methods("POST")

	//Student Instructor Assignment Feature
	m.HandleFunc("/instructors", supabase.GetInstructors).Methods("GET")
	m.HandleFunc("/instructors/{id}/students", supabase.GetInstructorStudents).Methods("GET")
	m.HandleFunc("/addStudent", supabase.AddStudentToInstructor).Methods("POST")

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
