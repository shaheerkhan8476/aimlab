package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
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
	//server port connection
	m.HandleFunc("/addUser", supabase.SignUpUser).Methods("POST")
	m.HandleFunc("/login", supabase.SignInUser).Methods("POST")
	m.HandleFunc("/patients", supabase.GetPatients).Methods("GET")
	m.HandleFunc("/patients/{id}", supabase.GetPatientByID).Methods("GET")
	m.HandleFunc("/prescriptions", supabase.GetPrescriptions).Methods("GET")
	m.HandleFunc("/prescriptions/{id}", supabase.GetPrescriptionByID).Methods("GET")
	handler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}).Handler(m)
	err = http.ListenAndServe(":8080", handler)
	if err != nil {
		fmt.Println(err)
	}
}
