package user

import (
	"encoding/json"
	"io"
	"net/http"
)

func AddUser(w http.ResponseWriter, r *http.Request) {
	var newUser User
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, newUser)

	if err != nil {
		print("Error when reading JSON Data")
	}
	w.WriteHeader(http.StatusOK)
	//add user to supabase here
}
