import { useEffect, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import "./css/PatientPage.css";


function PatientPage() {
    const { id } = useParams(); //gets id from url
    const [patient, setPatient] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`http://localhost:8060/patients/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => {
            if (!response.ok){
                throw new Error("patient not found");
            }
            return response.json()
        })
        .then(data => setPatient(data))
        .catch(error => {
            console.error(error);
            setPatient(null);
        });
    }, [id]);

    if (!patient)
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
                <button onClick={() => navigate('/StudentDashboard')} className="back-button">⬅ Back to Dashboard</button>
                <div className="patient-name">{patient.name}</div>
            </div>

            {/* Patient Health Summary Table */}
            <div className="patient-details">
                <table className="data-table">
                    <tbody>
                        <tr>
                            <td><strong>Date of Birth</strong></td>
                            <td>{patient.date_of_birth} (Age: {patient.age})</td>
                        </tr>
                        <tr>
                            <td><strong>Gender</strong></td>
                            <td>{patient.gender}</td>
                        </tr>
                        <tr>
                            <td><strong>Medical Condition</strong></td>
                            <td>{patient.medical_condition}</td>
                        </tr>
                        <tr>
                            <td><strong>Medical History</strong></td>
                            <td>{patient.medical_history}</td>
                        </tr>
                        <tr>
                            <td><strong>Family Medical History</strong></td>
                            <td>{patient.family_medical_history}</td>
                        </tr>
                        <tr>
                            <td><strong>Surgical History</strong></td>
                            <td>{patient.surgical_history}</td>
                        </tr>
                        <tr>
                            <td><strong>Cholesterol</strong></td>
                            <td>{patient.cholesterol}</td>
                        </tr>
                        <tr>
                            <td><strong>Allergies</strong></td>
                            <td>{patient.allergies}</td>
                        </tr>
                        <tr>
                            <td><strong>Medications</strong></td>
                            <td>{patient.medications}</td>
                        </tr>
                        <tr>
                            <td><strong>Patient Message</strong></td>
                            <td className="patient-message">{patient.patient_message}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PatientPage;