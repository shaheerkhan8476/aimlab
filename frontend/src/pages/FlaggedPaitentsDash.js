import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function FlaggedPatientsDash() {
    const [userName, setUserName] = useState("Instructor Name");
    const [flaggedPatients, setFlaggedPatients] = useState(null);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const userId = localStorage.getItem("userId");
        const token = localStorage.getItem("accessToken");

        if (!userId || !token) {
            console.error("User ID or token is missing");
            setIsAuthenticated(false);
            return;
        }

        // Get Teacher name
        fetch(`http://localhost:8060/students/${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => response.json())
        .then(data => setUserName(data.name || "Instructor"))
        .catch(() => setIsAuthenticated(false));

        // Get Flagged Patients
        fetch("http://localhost:8060/flaggedPatients", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => response.json())
        .then(async (data) => {
            

            // Fetch names for each flagger ID
            const paflaggerNames = await Promise.all(data.map(async (patient) => {
                if (!patient.flaggers || patient.flaggers.length === 0) return { ...patient, flaggers: ["N/A"] };

                const flaggerNames = await Promise.all(patient.flaggers.map(async (flaggerId) => {
                    try {
                        const res = await fetch(`http://localhost:8060/students/${flaggerId}`, {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                        });
                        const student = await res.json();
                        return student.name || "Unknown";
                    } catch {
                        return "Unknown";
                    }
                }));

                return { ...patient, flaggers: flaggerNames };
            }));

            setFlaggedPatients(paflaggerNames);
        })
        .catch(error => {
            console.error("Error fetching flagged patients:", error);
            setError("Error fetching flagged patients.");
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
                                onClick={() => navigate(`/FlaggedPatient/${patient.patient?.id}`)}>
                                    
                                <td>{patient.patient?.name || "Unknown"}</td>
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
