package main

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

	//http router
	m := mux.NewRouter()
	//endpoints
	m.HandleFunc("/addUser", supabase.SignUpUser).Methods("POST")
	m.HandleFunc("/login", supabase.SignInUser).Methods("POST")
	m.HandleFunc("/patients", supabase.GetPatients).Methods("GET")
	m.HandleFunc("/patients/{id}", supabase.GetPatientByID).Methods("GET")
	m.HandleFunc("/prescriptions", supabase.GetPrescriptions).Methods("GET")
	m.HandleFunc("/prescriptions/{id}", supabase.GetPrescriptionByID).Methods("GET")
	m.HandleFunc("/messageRequest", llm.RequestMessage).Methods("POST")
	m.HandleFunc("/students", supabase.GetStudents).Methods("GET")
	m.HandleFunc("/students/{id}", supabase.GetStudentById).Methods("GET")
	m.HandleFunc("/generateTasks", supabase.GenerateTasks).Methods("POST")
	m.HandleFunc("/{student_id}/tasks", supabase.GetTasksByStudentID).Methods("GET")
	m.HandleFunc("/{student_id}/tasks/{task_id}", supabase.GetTaskByID).Methods("GET")
	m.HandleFunc("/{student_id}/tasks/{task_id}/completeTask", supabase.CompleteTask).Methods("POST")
	//allow API requests from react frontend
	handler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}).Handler(m)
	//server port
	err = http.ListenAndServe(":8080", handler)
	if err != nil {
		fmt.Println(err)
	}
}
