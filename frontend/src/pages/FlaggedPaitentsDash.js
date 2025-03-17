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
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch user data");
            return response.json();
        })
        .then(data => setUserName(data.name))
        .catch(error => {
            console.error(error);
            setIsAuthenticated(false);

        });

        // Get Flagged Patients
        fetch("http://localhost:8060/flaggedPatients", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => {
            if (!response.ok) throw new Error("Failed to fetch flagged patients");
            return response.json();
        })
        .then(async (flaggedData) => {
            if (!Array.isArray(flaggedData) || flaggedData.length === 0) {
                setFlaggedPatients([]);
                return;
            }
            
            // Get paitents and flaggers
            const patientP = flaggedData.map((flagged) =>

                fetch(`http://localhost:8060/patients/${flagged.patient_id}`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                })
                .then(response => {
                    if (!response.ok) throw new Error("Failed to fetch patient data");
                    return response.json();
                })
                .then(patientData => {
                    // get flaggers
                    console.log("Flaggers for patient", flagged.patient_id, ":", flagged.flaggers);

                    const flaggerP = (flagged.flaggers || []).map((flaggerId) =>
                        fetch(`http://localhost:8060/students/${flaggerId}`, {
                            method: "GET",
                            headers: {
                                "Authorization": `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                        })
                        .then(response => {
                            if (!response.ok) throw new Error(`Failed to fetch student data for ${flaggerId}`);
                            return response.json();
                        })
                        .then(studentData => studentData.name)
                        .catch(error => {
                            console.error(`Error fetching flagger ${flaggerId}:`, error);
                            return "Unknown";
                        })
                    );

                    return Promise.all(flaggerP).then((flaggers) => ({
                        ...flagged,
                        patientName: patientData.name, // paitent name
                        flaggers, // list of people who flagged
                    }));
                })
            );

            const updatedFlaggedPatients = await Promise.all(patientP);
            setFlaggedPatients(updatedFlaggedPatients);
        })
        .catch(error => {
            console.error(error);
            setError("Error fetching flagged patients.");
        });

    }, []);

    if (!isAuthenticated) {
        return (
            <div className="not-authenticated">
                <h2>Access Denied</h2>
                <p>Uhhh... you're not supposed to be here. Come back when you're logged in, buddy boy.</p>
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
                    <p className="loading-message">...loading patient messages...</p>
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
                                <tr key={index} className="clickable-patient">
                                    <td>{patient.patientName}</td>
                                    <td>{(patient.flaggers || []).join(", ") || "N/A"}</td>
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
