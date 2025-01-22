package main

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	//http router
	m := mux.NewRouter()
	fmt.Println("Hello World")
	//server port connection
	err := http.ListenAndServe(":8080", m)
	if err != nil {
		fmt.Println(err)
	}
}
