package user

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/google/uuid"
)

func AddUser(w http.ResponseWriter, r *http.Request) {
	var newUser User
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &newUser)
	newUser.Id = uuid.New()
	fmt.Println(newUser)
	if err != nil {
		print("Error when reading JSON Data")
	}

	w.WriteHeader(http.StatusOK)
	//add user to supabase here
}
