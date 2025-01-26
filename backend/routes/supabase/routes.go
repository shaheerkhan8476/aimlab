package supabase

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	supabase "github.com/nedpals/supabase-go"
)

var Supabase *supabase.Client

func InitClient(url, key string) *supabase.Client {
	Supabase = supabase.CreateClient(url, key)
	return Supabase
}

func SignUpUser(w http.ResponseWriter, r *http.Request) {
	var reqBody struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	bodyBytes, _ := io.ReadAll(r.Body)
	err := json.Unmarshal(bodyBytes, &reqBody)
	if err != nil {
		print(err)
	}
	ctx := context.Background()
	user, err := Supabase.Auth.SignUp(ctx, supabase.UserCredentials{
		Email:    reqBody.Email,
		Password: reqBody.Password,
	})

	if err != nil {
		panic(err)
	}
	b, err := json.Marshal(user)
	if err != nil {
		print("Error", err)
	}
	w.Write(b)
}
