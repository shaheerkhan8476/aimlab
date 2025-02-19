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
	m.HandleFunc("/messageRequest", llm.RequestMessage).Methods("POST")
	m.HandleFunc("/students", supabase.GetStudents).Methods("GET")
	m.HandleFunc("/students/{id}", supabase.GetStudentById).Methods("GET")
	m.HandleFunc("/results", supabase.GetResults).Methods("GET")
	m.HandleFunc("/results/{id}", supabase.GetResultByID).Methods("GET")
	// LLM endpoint from the old version – add it if needed
	m.HandleFunc("/patients/{id}/llm-response", supabase.GetLLMResponseForPatient).Methods("GET")

	m.HandleFunc("/generateTasks", supabase.GenerateTasks).Methods("POST")
	m.HandleFunc("/{student_id}/tasks", supabase.GetTasksByStudentID).Methods("GET")
	m.HandleFunc("/{student_id}/tasks/{task_id}", supabase.GetTaskByID).Methods("GET")
	m.HandleFunc("/{student_id}/tasks/{task_id}/completeTask", supabase.CompleteTask).Methods("POST")
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
