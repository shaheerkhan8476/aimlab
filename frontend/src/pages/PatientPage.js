import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation} from 'react-router-dom';
import "./css/PatientPage.css";
import ReportFlag from "../images/report-flag.png"



function PatientPage() {
    const { id } = useParams(); //gets id from url
    const [activeTab, setActiveTab] = useState("info");
    const [patient, setPatient] = useState(null);
    const [results, setResults] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [aiResponse, setAIResponse] = useState(null); //Ai response. will eventually be sample response to patient
    const [userMessage, setUserMessage] = useState(""); //userMessage, updates with change to textarea below
    const [aiResponseUnlocked, setAIResponseUnlocked] = useState(false); //Controls ai response tab locking
    const [disableInput, setDisableInput] = useState(false);
    const [flagState, setFlagState] = useState(false);
    const [bannerMessage, setBannerMessage] = useState("");
    const [refillDecision, setRefillDecision] = useState("");
    const [finalMessage, setFinalMessage] = useState("");

    
    const navigate = useNavigate();
    const location = useLocation();

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

    useEffect(() => {
        if (!results.length && !prescriptions.length){ //wait for load
            return;
        }
        if (location.state?.task_type === "lab_result") {
            const relevantResult = results.find(res => res.id === location.state.result_id);
            if (relevantResult) {
                setBannerMessage(`Analyze the results of the ${relevantResult.test_name} for your patient!`);
            }
            else{ setBannerMessage("Couldn't find specific results task"); }
            setActiveTab("results");
        }

        else if (location.state?.task_type === "prescription") {
            const relevantPrescription = prescriptions.find(pres => pres.id === location.state.prescription_id);
            if (relevantPrescription) {
                setBannerMessage(`Should the ${relevantPrescription.medication} prescription be refilled? Why or why not?`);
            }
            else{ setBannerMessage("Couldn't find specific prescriptions task"); }
            setActiveTab("prescriptions");
        }

        else if (location.state?.task_type === "patient_question") {
            setBannerMessage("Respond to the patient's message!");
            setActiveTab("info");
        }
    }, [location.state, results, prescriptions]);

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

        let messageToSend = userMessage;

        if (location.state?.task_type === "prescription"){
            const refillMessage = `\n\nThe prescription should ${refillDecision === "Refill" ? "be refilled" : "not be refilled"}.`
            messageToSend += refillMessage;
        }

        const giga_json = {
            patient,
            results,
            prescriptions,
            pdmp: patient.pdmp || [],
            task_type: location.state?.task_type || "",
            user_message: messageToSend,
        };

        console.log(giga_json);
        
        fetch(`http://localhost:8060/llm-response`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(giga_json),

        })
        .then(response => response.json())
        .then(data => {
            setAIResponse(data.completion + ` Best Regards, ${localStorage.getItem("userName")}.`);
            setAIResponseUnlocked(true);
            setDisableInput(true);
        })
        .catch(error => console.error("Failed to get ai response", error));
    };

    const flagPatient = () => {
        const token = localStorage.getItem("accessToken");
        const userId = localStorage.getItem("userId")
        fetch(`http://localhost:8060/addFlag`,{
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify( {
                "id": `${userId}`,
                "patient_id": `${id}`,
                "user_id": `${userId}`
            }),

        })
        .then(data => {
            setFlagState(true);
        })
        .catch(error => console.error("Failed to flag patient", error));

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

            <button
                className={activeTab === "pdmp" ? "active-tab" : ""}
                onClick={() => setActiveTab("pdmp")}
            >
                PDMP
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
                                <td><strong>Immunizations</strong></td>
                                <td>
                                    {patient.immunization ? (
                                        <ul>
                                            {Object.entries(patient.immunization).map(([vax, date]) => (
                                                <li key={vax}>
                                                    {vax} ({date})
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        "No Immunizations"
                                    )}
                                </td>
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
                                <td><strong>Height</strong></td>
                                <td>{patient.height}</td>
                            </tr>
                            <tr>
                                <td><strong>Weight</strong></td>
                                <td>{patient.weight}</td>
                            </tr>
                            <tr>
                                <td><strong>Last Known Blood Pressure</strong></td>
                                <td>{patient.last_bp}</td>
                            </tr>


                            {location.state?.task_type === "patient_question" && (
                                <tr>
                                    <td><strong>Patient Message</strong></td>
                                    <td className="patient-message">{patient.patient_message}</td>
                                </tr>
                            )}
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
                                            {Object.entries(result.test_result).map(([key, value]) => {
                                                let displayValue;
                                                if (typeof value === "object" && value !== null) {
                                                    //check to see if you have the value as another object (usually in labs that have a specific value and reference value)
                                                    displayValue = `Value: ${value.value}, Reference Range: ${value.reference_range}`;
                                                } else if (typeof value === "boolean") {
                                                    displayValue = value ? "Positive" : "Negative";
                                                } else {
                                                    //meaning it's just a number
                                                    displayValue = value;
                                                }
                                                return (
                                                    <li key={key}>
                                                    {key}: {displayValue}
                                                    </li>
                                                );
                                                })}
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
                                </tr>
                            </thead>
                            <tbody>
                                {prescriptions.map((prescription, index) => (
                                    <tr key={index}>
                                        <td>{prescription.medication}</td>
                                        <td>{prescription.dose}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No prescriptions available.</p>
                    )}
                </div>
            )}

            {activeTab === "pdmp" && (
                <div className="pdmp">
                    <h2>PDMP</h2>
                    {patient.pdmp ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Drug</th>
                                    <th>Quantity</th>
                                    <th>Days</th>
                                    <th>Refills</th>
                                    <th>Date Written</th>
                                    <th>Date Filled</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patient.pdmp.map((entry, index) => (
                                    <tr key={index}>
                                        <td>{entry.drug}</td>
                                        <td>{entry.qty}</td>
                                        <td>{entry.days}</td>
                                        <td>{entry.refill}</td>
                                        <td>{entry.date_written}</td>
                                        <td>{entry.date_filled}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No PDMP Available</p>
                    )}
                    </div>
            )}

            
            {/* <img src={QuickReply} alt="Quick Reply" className="quick-reply"></img> */}

            {activeTab === "ai-response" && (
                <div className="ai-response">
                    <h2>AI Response</h2>
                    <p><strong>Your Response:</strong> {userMessage}</p>
                    <p><strong>AI Response:</strong> {aiResponse}</p>
                    <div className="flag-container">
                    {!flagState ? (
                        <button className="flag-patient-btn"><img src={ReportFlag} alt="report case" className="flag-patient" onClick={flagPatient}/></button>
                    
                    ) : (
                        <p><strong>Patient flagged, instructor notified!</strong></p>
                    )}
                    </div>
                </div>
            )}
        </div>

        {/* Task instruction banner */}
        {bannerMessage && <div className="task-banner">{bannerMessage}</div>}


        {!disableInput && (
        <div>
            <div className="ai-input-area">
                {location.state?.task_type === "prescription" && (
                    <div className="refill-buttons-container">
                        <label>
                            <input
                                type="radio"
                                name="refillDecision"
                                value="Refill"
                                checked={refillDecision === "Refill"}
                                onChange={(e) => setRefillDecision(e.target.value)}
                            />
                            Refill
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="refillDecision"
                                value="Don't Refill"
                                checked={refillDecision === "Don't Refill"}
                                onChange={(e) => setRefillDecision(e.target.value)}
                            />
                            Don't Refill
                        </label>
                    </div>
                )}
                
                
        </div>
        <div>
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