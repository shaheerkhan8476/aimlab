package main

//git sanity check for julian
import (
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
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

	// Endpoints
	m.HandleFunc("/addUser", supabase.SignUpUser).Methods("POST")
	m.HandleFunc("/login", supabase.SignInUser).Methods("POST")
	m.HandleFunc("/patients", supabase.GetPatients).Methods("GET")
	m.HandleFunc("/patients/{id}", supabase.GetPatientByID).Methods("GET")
	m.HandleFunc("/patients/{id}/prescriptions", supabase.GetPrescriptionsByPatientID).Methods("GET")
	m.HandleFunc("/patients/{id}/results", supabase.GetResultsByPatientID).Methods("GET")
	m.HandleFunc("/prescriptions", supabase.GetPrescriptions).Methods("GET")
	m.HandleFunc("/prescriptions/{id}", supabase.GetPrescriptionByID).Methods("GET")
	m.HandleFunc("/messageRequest", llm.RequestMessage).Methods("POST") // don't think this is used anymore?
	m.HandleFunc("/students", supabase.GetStudents).Methods("GET")
	m.HandleFunc("/students/{id}", supabase.GetStudentById).Methods("GET")
	m.HandleFunc("/results", supabase.GetResults).Methods("GET")
	m.HandleFunc("/results/{id}", supabase.GetResultByID).Methods("GET")
	// LLM endpoint from the old version – add it if needed
	m.HandleFunc("/patients/{id}/llm-response", supabase.GetLLMResponseForPatient).Methods("GET")
	m.HandleFunc("/flaggedPatients", supabase.GetFlaggedPatients).Methods("GET")
	m.HandleFunc("/addFlag", supabase.AddFlaggedPatient).Methods("POST")
	m.HandleFunc("/removePatient", supabase.RemoveFlaggedPatient).Methods("POST")
	m.HandleFunc("/keepPatient", supabase.KeepPatient).Methods("POST")

	// Endpoints for tasks (generating, getting, completing, etc.)
	m.HandleFunc("/generateTasks", supabase.GenerateTasksHTMLWrapper).Methods("POST")                 // generates variable amount of tasks for a student
	m.HandleFunc("/{student_id}/tasks", supabase.GetTasksByStudentID).Methods("GET")                  // displays tasks for a student, filtered by completion in request
	m.HandleFunc("/{student_id}/tasks/week", supabase.GetTaskByWeek).Methods("GET")                   // used to display a student's tasks, sorted by week
	m.HandleFunc("/{student_id}/tasks/{task_id}", supabase.GetTaskByID).Methods("GET")                // gets a singular task for a student
	m.HandleFunc("/{student_id}/tasks/{task_id}/completeTask", supabase.CompleteTask).Methods("POST") // completes that singular task

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
