package supabase

// User Create Request Model
type UserCreateRequest struct {
	Name            string `json:"name"`
	Password        string `json:"password"`
	Email           string `json:"email"`
	IsAdmin         bool   `json:"isAdmin"`
	StudentStanding string `json:"studentStanding"`
}

// User Login Request Model
type UserLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Task Create Request Model
type TaskCreateRequest struct {
	PatientTaskCount      int  `json:"patient_task_count"`
	LabResultTaskCount    int  `json:"lab_result_task_count"`
	PrescriptionTaskCount int  `json:"prescription_task_count"`
	GenerateQuestion      bool `json:"generate_question"`
}
