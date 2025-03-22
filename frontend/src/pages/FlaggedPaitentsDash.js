import { useEffect, useState } from "react";
import { data, useNavigate } from "react-router-dom";
import "./css/Flagg.css";
function FlaggedPatientsDash() {
    const [userName, setUserName] = useState("Instructor Name"); //helps sets instructor name deafault Instructor Name
    const [flaggedPatients, setFlaggedPatients] = useState(null);//set flagged paitents
    const [error, setError] = useState(null);// helps navigate through error
    const [isAuthenticated, setIsAuthenticated] = useState(true);//checks if auth default true
    const [refresh, setRefresh] = useState(0); //used to refresh screen
    const navigate = useNavigate();//naviagte to new page

    useEffect(() => {
        const userId = localStorage.getItem("userId");//get local userid
        const token = localStorage.getItem("accessToken");//get access token

        //check if auth
        if (!userId || !token) {
            setIsAuthenticated(false);
            return;
        }

        // get instructor name
        fetch(`http://localhost:8060/students/${userId}`, {
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
        fetch("http://localhost:8060/flaggedPatients", {
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
            
            // get each patient of name
            for (const patient of data) {
                //Empty array to hold student name
                const studentName = [];
                
                // get each flagger id of flaggers
                for (const flaggerId of patient.flaggers) {
                    try {
                        const res = await fetch(`http://localhost:8060/students/${flaggerId}`, {
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
        })
        .catch(error => {
            console.error("Error fetching flagged patients:", error);
        });
    }, [refresh]);//refresh screen

    // Handle keep patient request
    const handleKeep = async (patientId) => {
        const token = localStorage.getItem("accessToken");
        try {
            const response = await fetch("http://localhost:8060/keepPatient", {
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
            const response = await fetch("http://localhost:8060/removePatient", {
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

    return (
        <div className="dashboard-container">
            {/* Top Banner */}
            <div className="top-banner">
                <button onClick={() => navigate("/InstructorDashboard")} className="logout-but">
                    ⬅ Back to Dashboard
                </button>
                <div className="spacer"></div>
                <div className="welcome-message">Welcome, {userName}</div>
            </div>

            {/* Main content */}
            <div className="content">
                <h2>Flagged Patients</h2>

                {error ? (
                    <p className="error-message">{error}</p>
                ) : flaggedPatients === null ? (
                    <p className="loading-message">...loading flagged patients...</p>
                ) : flaggedPatients.length === 0 ? (
                    <p>No flagged patients found.</p>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Flaggers</th>
                            </tr>
                        </thead>
                        <tbody>
                            {flaggedPatients.map((patient, index) => (
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default FlaggedPatientsDash;
