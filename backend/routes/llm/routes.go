package llm

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"github.com/gorilla/mux"
)
// PostLLMResponseForPatient is the new route that forwards the entire GIGA JSON to app.py
func PostLLMResponseForPatient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"] // optional if you want to log or pass it for debugging

	// Read the raw JSON from the request body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read POST body", http.StatusBadRequest)
		return
	}

	fmt.Println("Received GIGA JSON for patient:", id)
	fmt.Println("Full JSON body:", string(bodyBytes)) // optional debug print

	// Forward the entire JSON payload to your Python microservice
	flaskURL := "http://127.0.0.1:5001/api/message-request"
	resp, err := http.Post(flaskURL, "application/json", bytes.NewBuffer(bodyBytes))
	if err != nil {
		fmt.Println("Error forwarding JSON to Flask microservice:", err)
		http.Error(w, "Failed to contact LLM microservice", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Read the LLM’s response from Python
	responseBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading LLM response:", err)
		http.Error(w, "Failed to read LLM response", http.StatusInternalServerError)
		return
	}

	// Return that response to the frontend
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(responseBytes)
}
