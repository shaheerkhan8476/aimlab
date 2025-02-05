package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func RequestMessage(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Attempting to send message to Flask")
	var msgRequest MessageRequest
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &msgRequest)
	if err != nil {
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
	//specific to Brad's URL we're going to need to Dockerize this
	flaskURL := "http://127.0.0.1:5000/api/message-request"
	responseHTML, err := http.Post(flaskURL, "application/json", bytes.NewBuffer(msgData))
	if err != nil {
		fmt.Println("Error sending message to Flask:", err)
		http.Error(w, "Failed to send message to Flask", http.StatusInternalServerError)
		return
	}
	response, err := io.ReadAll(responseHTML.Body)
	if err != nil {
		fmt.Println("Error reading response:", err)
		http.Error(w, "Failed to read response", http.StatusInternalServerError)
		return
	}
	fmt.Println("Response:", string(response))
}
