import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation, data} from 'react-router-dom';
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
    const [isAdmin, setIsAdmin] = useState(null); //If user is admin for flagging page    
    const [activeResultTab, setActiveResultTab] = useState(null);
    

    
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const taskId = queryParams.get("task_id");

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
            setIsAdmin(data.isAdmin)
        })
        .catch((error) => {
            console.error(error);
        });
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        const userId = localStorage.getItem("userId");//get local userid
        if (!token) return;

        //for patient details tab
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

        //for prescriptions tab
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

        // for student/AI response tab
        if (taskId) {  // should only run if there is a task id in the query params
            fetch(`http://localhost:8060/tasks/${taskId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            })
            .then(response => response.json())
            .then(data => {  
                if (data.completed) {   // if task is already completed, show the AI response
                    setAIResponseUnlocked(true);
                    setDisableInput(true);
                    setActiveTab("ai-response");
                    setUserMessage(data.student_response);
                    setAIResponse(data.llm_feedback);
                }
            })
            .catch(error => console.error("Failed to get student and AI response for task", error));
        }

    }, [id, taskId]);

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

        setDisableInput(true);

        if (location.state?.task_type === "prescription"){
            let userMessageCopy = userMessage;
            let refillMessage = `\n\nThe prescription should ${refillDecision === "Refill" ? "be refilled" : "not be refilled"}.`
            setUserMessage(userMessageCopy + refillMessage);
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

    const handleCompletion = () => {
        const token = localStorage.getItem("accessToken");
        const userId = localStorage.getItem("userId")
        fetch(`http://localhost:8060/${userId}/tasks/${location.state.task_id}/completeTask`,{
            method:'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               'student_response': `${userMessage}`,
               'llm_feedback': `${aiResponse}` 
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`whoopsies! no task completion`);
            }
        })
        .then(data => {navigate('/StudentDashboard')})
        .catch(error => console.error("Failed to complete", error));
    };

    return (
        <div className="patient-container">
        {/* Header, name, logout button */}
        {(!isAdmin) && (
        <div className="patient-header">
            
            <button onClick={() => navigate('/StudentDashboard')} className="back-button">⬅ Back to Dashboard</button>
            <div className="patient-name">{patient.name}</div>
        </div>
        )}
        {/*If teacher going through flagged go back that way*/}
        {(isAdmin) && (
        <div className="patient-header">
            
            <button onClick={() => navigate('/FlaggedPatientsDash')} className="back-button">⬅ Back to Dashboard</button>
            <div className="patient-name">{patient.name}</div>
        </div>
        )}


       {/* Task instruction banner */}
        {bannerMessage && <div className="task-banner">{bannerMessage}</div>}
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

        {activeTab === "results" && results.length > 0 && (
            <div className="sub-tab-navigation">
                {results.map((result, index) => (
                    <button
                        key={index}
                        className={activeResultTab === index ? "active-sub-tab" : ""}
                        onClick={() => setActiveResultTab(index)}
                    >
                        {result.test_name}
                    </button>
                ))}
            </div>
        )}



        {/* Display info based on tab selected */}
        <div className="patient-content">
        {activeTab === "info" && (
            <div className="patient-details">
                <h2>General Info</h2>
                <div className="health-summary">
                
                <div className="info-group">
                    <h3>Demographics</h3>
                    <p><strong>Date of Birth:</strong> {patient.date_of_birth} (Age: {patient.age})</p>
                    <p><strong>Gender:</strong> {patient.gender}</p>
                </div>

                <div className="info-group">
                    <h3>Medical Condition</h3>
                    <p>{patient.medical_condition}</p>
                </div>

                <div className="info-group">
                    <h3>Allergies</h3>
                    <p>{patient.allergies || "None"}</p>
                </div>

                <div className="info-group">
                    <h3>Immunizations</h3>
                    {patient.immunization ? (
                    <ul>
                        {Object.entries(patient.immunization).map(([vax, date]) => (
                        <li key={vax}>{vax} ({date})</li>
                        ))}
                    </ul>
                    ) : (
                    <p>No Immunizations</p>
                    )}
                </div>

                <div className="info-group">
                    <h3>Medical History</h3>
                    <p>{patient.medical_history}</p>
                </div>

                <div className="info-group">
                    <h3>Family Medical History</h3>
                    <p>{patient.family_medical_history}</p>
                </div>

                <div className="info-group">
                    <h3>Surgical History</h3>
                    <p>{patient.surgical_history}</p>
                </div>

                <div className="info-group">
                    <h3>Vitals and Measurements</h3>
                    <p><strong>Cholesterol:</strong> {patient.cholesterol}</p>
                    <p><strong>Height:</strong> {patient.height}</p>
                    <p><strong>Weight:</strong> {patient.weight}</p>
                    <p><strong>Blood Pressure:</strong> {patient.last_bp}</p>
                </div>

                {location.state?.task_type === "patient_question" && (
                <div className="info-group full-width">
                    <h3>Patient Message</h3>
                    <p className="patient-message">{patient.patient_message}</p>
                </div>
                )}


                </div>
                
            </div>
            
        )}


            {activeTab === "results" && (
                <div className="patient-results">
                    <h2>Lab Results</h2>
                    {results && results.length > 0 ? (
                        <>
                        {activeResultTab !== null ? (
                            <div className="lab-result-group">
                            <h3>{results[activeResultTab].test_name}</h3>
                            <p><strong>Date:</strong> {results[activeResultTab].test_date}</p>
                          
                            {(() => {
                              const currentResult = results[activeResultTab];
                              const hasReferenceRange = Object.values(currentResult.test_result).some(
                                (value) => typeof value === "object" && value.reference_range
                              );
                          
                              return (
                                <table className="data-table">
                                  <thead>
                                    <tr>
                                      <th>Test</th>
                                      <th>Result</th>
                                      {hasReferenceRange && <th>Reference Range</th>}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Object.entries(currentResult.test_result).map(([key, value]) => {
                                      const resultVal = typeof value === "object" && value !== null
                                        ? value.value
                                        : typeof value === "boolean"
                                        ? (value ? "Positive" : "Negative")
                                        : value;
                          
                                      const referenceRange = (typeof value === "object" && value.reference_range) || null;
                          
                                      return (
                                        <tr key={key}>
                                          <td>{key}</td>
                                          <td>{resultVal}</td>
                                          {hasReferenceRange && <td>{referenceRange || ""}</td>}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              );
                            })()}
                          </div>
                          
                        ) : (
                            <p>Select a test to view results.</p>
                        )}
                        </>
                        
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
                    <div className="complete-container">
                    {(
                        <button className="complete-task-btn" onClick={handleCompletion}>Complete Task</button>
                    )}
                    </div>
                </div>
            )}
        </div>

    

        {(!disableInput && !isAdmin) && (
        <div>
            <div className="ai-input-area">
                {location.state?.task_type === "prescription" && (
                    <div className="refill-buttons-container">
                        <input
                            type="radio"
                            name="refillDecision"
                            value="Refill"
                            id="refill"
                            checked={refillDecision === "Refill"}
                            onChange={(e) => setRefillDecision(e.target.value)}
                        />
                        <label htmlFor="refill">Refill</label>
                    
                        <input
                            type="radio"
                            name="refillDecision"
                            value="Don't Refill"
                            id="dont-refill"
                            checked={refillDecision === "Don't Refill"}
                            onChange={(e) => setRefillDecision(e.target.value)}
                        />
                        <label htmlFor="dont-refill">Don't Refill</label>
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