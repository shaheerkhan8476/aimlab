import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function FlaggedPatients() {
    const [userName, setUserName] = useState("Instructor Name");
    const navigate = useNavigate();

    useEffect(() => {
        const userId = localStorage.getItem("userId");
        const token = localStorage.getItem("accessToken");

        if (!userId || !token) {
            console.error("User ID or token is missing");
            navigate("/"); 
            return;
        }

        fetch(`http://localhost:8060/students/${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to fetch user data");
            }
            return response.json();
        })
        .then((data) => {
            setUserName(data.name);
        })
        .catch((error) => {
            console.error(error);
            localStorage.removeItem("accessToken"); // Remove invalid token
            localStorage.removeItem("userId");
            navigate("/login"); // Force re-login
        });
    }, [navigate]);

    return (
        <div className="dashboard-container">
            {/* Top Banner */}
            <div className="top-banner">
                <button onClick={() => navigate("/InstructorDashboard")} className="logout-but">
                    ⬅ Back to Dashboard
                </button>

                <div className="spacer"></div> {/* Pushes name to the right */}

                <div className="welcome-message">Welcome, {userName}</div>
            </div>

            {/* Main content */}
            <div className="content">
                <h2>Flagged Patients</h2>
                <p>Display flagged patients here...</p>
            </div>
        </div>
    );
}

export default FlaggedPatients;
