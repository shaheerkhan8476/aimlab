package main

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"gitlab.msu.edu/team-corewell-2025/routes/database"
)

func main() {
	//http router
	m := mux.NewRouter()
	fmt.Println("Hello World")
	m.HandleFunc("/patients", database.ReadPatientsTest).Methods("GET")
	//server port connection
	err := http.ListenAndServe(":8080", m)
	if err != nil {
		fmt.Println(err)
	}
}
