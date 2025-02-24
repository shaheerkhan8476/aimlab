import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./css/StudentDetails.css"; // Your provided styles

function StudentDetails() {
    const { id } = useParams(); // Gets ID from URL
    const [student, setStudent] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [patient, setPatients] = useState({}); // Store patient names

    const navigate = useNavigate();

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
            if (!response.ok) throw new Error("Student not found");
            return response.json();
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

            // Fget paitent for id
            const patient_Id = [...new Set(data.flatMap(whold => whold.tasks.map(task => task.patient_id)))];
            
            const patientData = {};
            await Promise.all(
                patient_Id.map(async (patientId) => {
                    try {
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

    if (!student) {
        return <p>Patient loading, please wait</p>;
    }

    return (
        <div className="student-container">
            {/* Header */}
            <div className="student-header">
                <button onClick={() => navigate("/InstructorDashboard")} className="back-button">
                    Back to Dashboard
                </button>
                <div className="student-name">{student.name}</div>
            </div>

            {/* Tasks*/}
            <div className="tasks-section">
                <h2>All Tasks</h2>
                {tasks.length > 0 ? (
                    tasks.map((week, windex) => (
                        <div key={windex} className="task-week">
                            <h3>Week {week.week}</h3>
                            <ul className="task-list">
                                {week.tasks.map((task, tindex) => (
                                    <li key={tindex} className="task-item">
                                        <span className="task-id">Task: {patient[task.patient_id]}</span>
                                        <span className={`task-status ${task.completed ? "completed" : "incomplete"}`}>
                                            {task.completed ? " Completed" : " Incomplete"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))
                ) : (
                    <p>No tasks available</p>
                )}
            </div>
        </div>
    );
}

export default StudentDetails;
