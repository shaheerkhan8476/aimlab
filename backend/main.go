package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
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
	m.HandleFunc("/addUser", supabase.SignUpUser)
	err = http.ListenAndServe(":8080", m)
	if err != nil {
		fmt.Println(err)
	}
}
