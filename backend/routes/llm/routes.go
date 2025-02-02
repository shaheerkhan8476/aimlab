package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func RequestMessage(w http.ResponseWriter, r *http.Request) {
	var msgRequest MessageRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &msgRequest)
	if err != nil {
		// Print the error and return a bad request response
		fmt.Println("Error unmarshaling message:", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	msgData, err := json.Marshal(msgRequest)
	if err != nil {
		fmt.Println("Error marshaling message:", err)
		http.Error(w, "Failed to marshal message", http.StatusInternalServerError)
		return
	}
	flaskURL := "http://localhost:5050/messageRequest"
	response, err := http.Post(flaskURL, "application/json", bytes.NewBuffer(msgData))
	if err != nil {
		fmt.Println("Error sending message to Flask:", err)
		http.Error(w, "Failed to send message to Flask", http.StatusInternalServerError)
		return
	}
	fmt.Println("Successful", response)
}
