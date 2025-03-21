import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function FlaggedPatientsDash() {
    const [userName, setUserName] = useState("Instructor Name"); //helps sets instructor name deafault Instructor Name
    const [flaggedPatients, setFlaggedPatients] = useState(null);//set flagged paitents
    const [error, setError] = useState(null);// helps navigate through error
    const [isAuthenticated, setIsAuthenticated] = useState(true);//checks if auth default true
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
        // get paitients that are flagged
        fetch("http://localhost:8060/flaggedPatients", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => response.json())
        .then(async (data) => {
            

            // get names for each flagged paitent
            const paflaggerNames = await Promise.all(data.map(async (patient) => {
                //for every id get name
                const flaggerNames = await Promise.all(patient.flaggers.map(async (flaggerId) => {
                    //get student data with id
                    try {
                        const res = await fetch(`http://localhost:8060/students/${flaggerId}`, {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                        });
                        const student = await res.json();
                        return student.name;
                    } catch {
                        return "Error flagger name not found";
                    }
                }));
                //return with paitent bit flagger replaced by names
                return { ...patient, flaggers: flaggerNames };
            }));

            setFlaggedPatients(paflaggerNames);
        })
        .catch(error => {
            console.error("Error fetching flagged patients:", error);
        });
    }, []);

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
