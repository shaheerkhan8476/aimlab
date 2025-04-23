# aimlabhealth.com | Getting Started Locally

Follow these steps to run the project on your local machine.

---

## Backend

```bash
cd backend
go run .
```

- Create a `.env` file containing:
  - `SUPABASE_URL`
  - `SUPABASE_KEY` (your Supabase API key)
- The login credentials are the same as the project email: [corewellcapstone@gmail.com](mailto:corewellcapstone@gmail.com)

---

## Frontend

```bash
cd frontend
npm install
npm start
```

---

## Flask-LLM Microservice

```bash
cd Flask-llm
docker compose build
docker compose up
```

- Create a `.env` file containing:
  - `OPENAI_API_KEY`  
    Retrieve this from the OpenAI API page by purchasing credits under [corewellcapstone@gmail.com](mailto:corewellcapstone@gmail.com):  
    https://platform.openai.com/docs/overview

---

## Hosting & Deployment

- **Vercel & Railway**  
  Use the same credentials as your project email to log in:
  - Vercel: login with [corewellcapstone@gmail.com](mailto:corewellcapstone@gmail.com)  
  - Railway: choose “Continue with Google” and select the same Gmail account  

- **Branches for Hosting**  
  - **Backend**: `shaheer/hosting-branch`  
  - **Frontend**: `PradyumnaFrontendHosting`

---

## Email Notifications

We use **Resend** (SMTP) to handle all application-related emails, including:

- Account verification
- Password reset


---

Buttons Explained:
=================

## Login Page
- **Login**: Submits the user’s credentials.  
- **Sign Up**: Navigates to the registration form.  
- **Forgot Password**: Opens the password-reset page.  

## Forgot Password Page
- **Reset Password**: Submits new password credentials.  
- **Back to Login**: Returns to the login page.  

## Student Dashboard
- **Patient Messages**: View message-based tasks.  
- **Results**: View lab-result tasks.  
- **Prescriptions/Refills**: View medication refill tasks.  
- **Previous Tasks**: See a list of completed tasks.  
- **Quick Reply**: Send a short response directly from the dashboard.  
- **Patient Entry** (clickable): Click any patient row to view detailed information.  

## Patient Page
- **Data Tabs**: Click any tab to show that patient’s data.  
- **Submit Response**: Sends the student’s reply and unlocks the **AI Response** tab.  
- **Flag Patient**: On the **AI Response** tab, flags a patient for abnormal data.  

## Instructor Dashboard
- **View Flagged Patients**: Shows all patients flagged by students, along with their rationale.  
- **Student Entry** (clickable): Click any student to view their task-completion history and task details.  

## Flagged Patient Dashboard
- **Remove Patient**: Deletes the flagged patient from future assignments.  
- **Keep Patient**: Retains the patient in rotation despite the flag.  
- **View Message**: Displays the student’s rationale for flagging that patient.  
