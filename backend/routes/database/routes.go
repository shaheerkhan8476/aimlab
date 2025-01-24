package database

import (
	"fmt"
	"net/http"
)

func ReadPatientsTest(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Read Patients Endpoint Hit")
	w.WriteHeader(http.StatusOK)
}
