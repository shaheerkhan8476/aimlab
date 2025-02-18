import { useEffect, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import "./css/PatientPage.css";


function StudentDetails() {
    const { id } = useParams(); //gets id from url
    const [student, setStudent] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
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
    }, [id]);

    if (!student)
    {
        {/* this is very necessary, it tries to pull null values from
            the variable with the api response if you don't have this
            and it breaks */}
        return (
            <p>Patient loading, please wait</p>
        )
    }

    return (
        <div className="patient-container">
            {/* Header with Banner */}
            <div className="patient-header">
                <button onClick={() => navigate('/InstructorDashboard')} className="back-button">⬅ Back to Dashboard</button>
                <div className="patient-name">{student.name}</div>
            </div>

        </div>
    );
}


export default StudentDetails;