import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import "./css/StudentDetails.css";//My Provided Style
import LoadingSpinner from "./components/LoadingSpinner";//Your Provided Style

function StudentDetails() {
    const { id } = useParams(); //Gets Id From Url
    const [student, setStudent] = useState(null); //store student
    const [tasks, setTasks] = useState([]); //store task
    const [patient, setPatients] = useState({}); // Store patient names

    const navigate = useNavigate();//naviagtes back to instrctor dash

    const [isInstructor, setIsInstructor] = useState(null);//checks if teacher

    useEffect(() => {
        // Fetch user details (to check if they are an instructor)
        const userId = localStorage.getItem("userId");
        console.log(userId);
        if (!userId) {
            console.error("User ID is not in local storage");
            return
        }
        fetch(`http://localhost:8060/students/${userId}`,{
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                "Content-Type": "application/json",
            },
        })
        
        .then((response) => {
            if (!response.ok) {
                throw new Error("failed fetching user data");
            }
            return response.json();
        })
        .then((data) => {
            console.log("fetched user data:", data);
            setIsInstructor(data.isAdmin)
        })
        .catch((error) => {
            console.error(error);
            setStudent(null);
        });
    }, []);


    useEffect(() => {
        // Get student details
        fetch(`http://localhost:8060/students/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => {
            if (!response.ok){
                throw new Error("student not found");
            }
            return response.json()
        })
        .then(data => setStudent(data))
        .catch(error => {
            console.error(error);
            setStudent(null);
        });

        // Get tasks
        fetch(`http://localhost:8060/${id}/tasks/week`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => response.json())
        .then(async (data) => {
        
            setTasks(data || []);
            //Get Paitent For Id
            const patient_Id  = [...new Set(data.flatMap(week => week.Days.flatMap(day => day.Tasks.map(task => task.patient_id))))];

            const patientData = {};
            await Promise.all(
                patient_Id .map(async (patientId) => {
                    try {
                        //loads patient with its id
                        const response = await fetch(`http://localhost:8060/patients/${patientId}`, {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                                "Content-Type": "application/json",
                            },
                        });
                        if (response.ok) {
                            const holder = await response.json();
                            patientData[patientId] = holder.name;
                        }
                    } catch (error) {
                        console.error(`Error fetching patient ${patientId}:`, error);
                    }
                })
            );

            setPatients(patientData);
        })
        .catch(error => {
            console.error(error);
            setTasks([]);
        });
    }, [id]);

    if (!student)
    {
     
        return (
            <LoadingSpinner />
        )
    }

    function isLate(createdAt, completedAt) {
        const created = new Date(createdAt);
        const completed = new Date(completedAt);
        const diffInMs = completed - created;
        const hoursDiff = diffInMs / (1000 * 60 * 60);
        return hoursDiff >= 24;
    }
      
    return (
        
        <div className="student-container">
            {/* Header */}
            <div className="student-header">
                <button onClick={() => navigate(isInstructor ? "/InstructorDashboard" : "/StudentDashboard")} className="back-button">
                    ⬅ Back to Dashboard
                </button>
                <div className="student-name">{student.name}</div>
            </div>

            {/* Tasks*/}
            <div className="tasks-section">
                <h2>All Tasks</h2>
                {tasks.length > 0 ? (
                    tasks.map((week, windex) => {
                        const totalTasks = week.Days.reduce((acc, day) => acc + day.Tasks.length, 0);
                        const completedTasks = week.Days.reduce((acc, day) => acc + day.Tasks.filter(task => task.completed).length, 0);
                        const weeklyCompletionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;
                        
                        return (
                            //displays task
                            <div key={windex} className="task-week">
                                <h3>Week {week.Week} - Completion Rate: {weeklyCompletionRate}%</h3>
                                {week.Days.map((day, dindex) => (
                                    <div key={dindex} className="task-day">
                                        <h4>Day {day.Day} - Completion Rate: {day.CompletionRate.toFixed(2)}%</h4>
                                        <ul className="task-list">
                                            {day.Tasks.map((task, tindex) => (
                                                <li key={tindex} className="task-item">
                                                    <span className="task-id">
                                                        Task: {" "}
                                                        <Link to={{
                                                            pathname: `/PatientPage/${task.patient_id}`,
                                                            search: `?task_id=${task.id}&task_type=${task.task_type}&from=studentDetails`,
                                                        }}
                                                            className="task-link"
                                                        >
                                                        {patient[task.patient_id] || "Unknown Patient"} - {task.task_type.replace(/_/g, " ")}
                                                        </Link>
                                                    </span>
                                                    <span className={`task-status-${task.completed ? "completed" : "incomplete"}`}>
                                                        {task.completed && isLate(task.created_at, task.completed_at) && (
                                                            <span className="late-tag"> LATE </span>
                                                        )}
                                                        {task.completed ? " Complete" : " Incomplete"}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        );
                    })
                ) : (
                    <p>No tasks available</p>
                )}
            </div>
        </div>
    );
}

export default StudentDetails;
