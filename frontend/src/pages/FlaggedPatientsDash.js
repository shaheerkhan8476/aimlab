import { useEffect, useState } from "react";
import { data, useNavigate } from "react-router-dom";
import React from "react";
import "./css/Flagg.css";
import LoadingSpinner from "./components/LoadingSpinner";
function FlaggedPatientsDash() {
    const [userName, setUserName] = useState(""); //helps sets instructor name deafault Instructor Name
    const [flaggedPatients, setFlaggedPatients] = useState(null);//set flagged paitents
    const [error, setError] = useState(null);// helps navigate through error
    const [isAuthenticated, setIsAuthenticated] = useState(true);//checks if auth default true
    const [refresh, setRefresh] = useState(0); //used to refresh screen
    const navigate = useNavigate();//naviagte to new page
    const [messages, setMessages] = useState({});
    const [showMessage, setShowMessage] = useState(null);
 

    useEffect(() => {
        const userId = localStorage.getItem("userId");//get local userid
        const token = localStorage.getItem("accessToken");//get access token
        const isAdmin = localStorage.getItem("isAdmin")  === "true"; //get is admin and make it a bool

        
        //check if auth
        if (!userId || !token || !isAdmin ) {
            setIsAuthenticated(false);
            return;
        }
       
        
        // get instructor name
        fetch(`https://corewell-backend-production.up.railway.app/students/${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
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
            setUserName(data.name)
        })
        .catch((error) => {
            console.error(error);
        });
        fetch("https://corewell-backend-production.up.railway.app/flaggedPatients", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => response.json())
        .then(async (data) => {
            //empty arrary to hold flagger name
            const flaggerName = [];
            const studentMessage = {};

                     // get each patient of name
                    for (const patient of data) {
                        //Empty array to hold student name
                        const studentName = [];
                  
                        
                        studentMessage[patient.patient_id] = patient.messages || {};

                        // get each flagger id of flaggers
                        for (const flaggerId of patient.flaggers) {
                            try {
                                const res = await fetch(`https://corewell-backend-production.up.railway.app/students/${flaggerId}`, {
                                    method: "GET",
                                    headers: {
                                        "Authorization": `Bearer ${token}`,
                                        "Content-Type": "application/json",
                                    },
                                });
                                const student = await res.json();
                                //add name of student to array
                                studentName.push(student.name);
                            } catch {
                                return "Error flagger name not found";
                            }
                        }
                        //Replace flagger id with student name
                        flaggerName.push({ ...patient, flaggers: studentName });
                    }
                    //Set the flagged patient to array of flaggers
                    setFlaggedPatients(flaggerName);
                    setMessages(studentMessage);
                })
                .catch(error => {
                    console.error("Error fetching flagged patients:", error);
                });
            }, [refresh]);//refresh screen
        
            // Handle keep patient request   
    const handleKeep = async (patientId) => {
        const token = localStorage.getItem("accessToken");
        try {
            const response = await fetch("https://corewell-backend-production.up.railway.app/keepPatient", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                //feeds the paitent id
                body: JSON.stringify({ patient_id: patientId }),
            });
            if (response.ok) {
                setRefresh(prev => prev + 1);//will refresh
            } else {
                console.error("Failed to keep patient:", response.statusText);
            }
        } catch (error) {
            console.error("Error keeping patient:", error);
        }
    };
     //Handle remove patient request
    const handleRemove = async (patientId) => {
        const token = localStorage.getItem("accessToken");
        try {
            const response = await fetch("https://corewell-backend-production.up.railway.app/removePatient", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                 //feeds the patient id
                body: JSON.stringify({ patient_id: patientId }),
            });
            if (response.ok) {
                setRefresh(prev => prev + 1);//refreshes
            } else {
                console.error("Failed to remove patient:", response.statusText);
            }
        } catch (error) {
            console.error("Error removing patient:", error);
        }




    };
    if (!isAuthenticated) {
        return (
            <div className="not-authenticated">
                <h2>Access Denied</h2>
                <p>Please log in to continue.</p>
                <button onClick={() => navigate("/")} className="login-button">
                    Go to Login
                </button>
            </div>
        );
    }
else{
    return (
        <div className="dashboard-container">
            {/* Top Banner */}
            <div className="top-banner">
                <button onClick={() => navigate("/InstructorDashboard")} className="logout-but">
                    ⬅ Back to Dashboard
                </button>
                <div className="spacer"></div>
                
                {userName && (<div className="welcome-message">Welcome, {userName}</div>
)}
            </div>

            {/* Main content */}
            <div className="content">
                <h2>Flagged Patients</h2>
                
                {error ? (
                    <p className="error-message">{error}</p>
                ) : flaggedPatients === null ? (
                    <LoadingSpinner />
                ) : flaggedPatients.length === 0 ? (
                    <p>No flagged patients found.</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Flaggers</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flaggedPatients.map((patient, index) => (
                                <React.Fragment key={index}> {/*tr cant be child of another */}
                                 <tr key={index} className="clickable-patient"
                                    onClick={() => navigate(`/PatientPage/${patient.patient_id}`)}>

                                    <td>{patient.patient?.name }</td>
                                        {/*displays flaggers with , in betweeb*/}
                                        <td>{(patient.flaggers || []).join(", ")}</td>

                                    {/* Keep and Remove buttons */}
                                        <td>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevents from clicking on flagged patient
                                                handleKeep(patient.patient_id);//runs keep
                                            }} className="keep-button">Keep
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); //prevents from clicking on flagged patient
                                            handleRemove(patient.patient_id);//runs remove
                                             }} className="remove-button">Remove
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); //prevents from clicking on flagged patient
                                                setShowMessage(showMessage === index ? null : index);//Runs Show message
                                             }} className="message-button">View Message
                                        </button>
                                            
                                        </td>
                                    </tr>
                                    {showMessage === index && (
                                        <tr>
                                            <td colSpan="3">
                                                <div className="message-box">
                                                    {messages[patient.patient_id] && Object.keys(messages[patient.patient_id]).length > 0 ? (
                                                        Object.entries(messages[patient.patient_id]).map(([flagger, message], msgIndex) => (
                                                            <div 
                                                                key={msgIndex} 
                                                                className={`message-item ${msgIndex === Object.entries(messages[patient.patient_id]).length - 1 ? 'last-message' : ''}`}
                                                            >
                                                                <span className="flagger-name">{flagger}:</span>
                                                                <span className="message-text">{message}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p>There are no messages for this flagged patient.</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
}

export default FlaggedPatientsDash;
