import { useEffect, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import "./css/PatientPage.css";


function PatientPage() {
    const { id } = useParams(); //gets id from url
    const [activeTab, setActiveTab] = useState("info");
    const [patient, setPatient] = useState(null);
    const [results, setResults] = useState(null);
    const [prescriptions, setPrescriptions] = useState(null);
    const [aiResponse, setAIResponse] = useState(null); //Ai response. will eventually be sample response to patient
    const [userMessage, setUserMessage] = useState(""); //userMessage, updates with change to textarea below
    const [aiResponseUnlocked, setAIResponseUnlocked] = useState(false); //Controls ai response tab locking
    const [disableInput, setDisableInput] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        //for patient detials tab
        fetch(`http://localhost:8060/patients/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => response.json())
        .then(data => setPatient(data))
        .catch(error => console.error("Failed to fetch patient", error));

        //for results tab
        fetch(`http://localhost:8060/patients/${id}/results`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => response.json())
        .then(data => setResults(data))
        .catch(error => console.error("Failed to fetch results", error));

        //for prescripitiosn tab
        fetch(`http://localhost:8060/patients/${id}/prescriptions`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },

    })
    .then(response => response.json())
    .then(data => setPrescriptions(data))
    .catch(error => console.error("Failed to fetch prescriptions:", error));

    }, [id]);

    if (!patient)
    {
        {/* this is very necessary, it tries to pull null values from
            the variable with the api response if you don't have this
            and it breaks */}
        return (
            <div className="loading-screen">
                ...loading patient data...
            </div>
        )
    }

    // Ai messaging part. This will be actually getting the response to patient that brad made but it's
    // not part of main as of me making this. I will change once brad's thing is in main. Will be easy switch.
    //For now, you type response in the box and ai responds to that, whatever it is.
    const handleSubmit = () => {
        const token = localStorage.getItem("accessToken");

        //do nothing if nothing typed yet
        if (!token || !userMessage) {
            return;
        }

        fetch(`http://localhost:8060/patients/${id}/llm-response`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },

        })
        .then(response => response.json())
        .then(data => {
            setAIResponse(data.completion);
            setAIResponseUnlocked(true);
            setDisableInput(true);
        })
        .catch(error => console.error("Failed to get ai response", error));
    };

    return (
        <div className="patient-container">
        {/* Header, name, logout button */}
        <div className="patient-header">
            <button onClick={() => navigate('/StudentDashboard')} className="back-button">⬅ Back to Dashboard</button>
            <div className="patient-name">{patient.name}</div>
        </div>

        {/* New tab nav */}
        <div className="tab-navigation">
            <button 
                className={activeTab === "info" ? "active-tab" : ""} 
                onClick={() => setActiveTab("info")}
            >
                General Info
            </button>
            <button 
                className={activeTab === "results" ? "active-tab" : ""} 
                onClick={() => setActiveTab("results")}
            >
                Results
            </button>
            <button 
                className={activeTab === "prescriptions" ? "active-tab" : ""} 
                onClick={() => setActiveTab("prescriptions")}
            >
                Prescriptions
            </button>

            {/*Ai repsonse tab locked until response submitted */}
            <button 
                className={activeTab === "ai-response" ? "active-tab" : ""} 
                onClick={() => aiResponseUnlocked && setActiveTab("ai-response")}
                disabled={!aiResponseUnlocked} // no click allowed if response locked
                style={{ opacity: aiResponseUnlocked ? 1 : 0.5 }} // grayed if locked. can make padlock icon later if we want it
            >
                AI Response
            </button>
        </div>


        {/* Display info based on tab selected */}
        <div className="patient-content">
            {activeTab === "info" && (
                <div className="patient-details">
                    <h2>General Info</h2>
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
                                <td><strong>Allergies</strong></td>
                                <td>{patient.allergies}</td>
                            </tr>
                            <tr>
                                <td><strong>Patient Message</strong></td>
                                <td className="patient-message">{patient.patient_message}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === "results" && (
                <div className="patient-results">
                    <h2>Lab Results</h2>
                    {results && results.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Test Name</th>
                                    <th>Test Date</th>
                                    <th>Results</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result, index) => (
                                    <tr key={index}>
                                        <td>{result.test_name}</td>
                                        <td>{result.test_date}</td>
                                        <td>
                                            <ul>
                                                {Object.entries(result.test_result).map(([substance, detected]) => (
                                                    <li key={substance}>
                                                        {substance}: {detected ? "Positive" : "Negative"}
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No test results available.</p>
                    )}
                </div>
            )}

            {activeTab === "prescriptions" && (
                <div className="patient-prescriptions">
                    <h2>Prescriptions</h2>
                    {prescriptions && prescriptions.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Medication</th>
                                    <th>Dose</th>
                                    <th>Refill Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prescriptions.map((prescription, index) => (
                                    <tr key={index}>
                                        <td>{prescription.medication}</td>
                                        <td>{prescription.dose}</td>
                                        <td>{prescription.refill_status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No prescriptions available.</p>
                    )}
                </div>
            )}

            {activeTab === "ai-response" && (
                <div className="ai-response">
                    <h2>AI Response</h2>
                    <p><strong>Your Response:</strong> {userMessage}</p>
                    <p><strong>AI Response:</strong> {aiResponse}</p>
                </div>
            )}
        </div>

        {!disableInput && (
        <div>
        <div className="ai-input-area">
            <textarea
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Type response here"
                className="ai-input-box"
            />
            
        </div>
        <button onClick={handleSubmit} className="submit-response">Submit</button>
        </div>
        )}

    </div>
    );
}

export default PatientPage;