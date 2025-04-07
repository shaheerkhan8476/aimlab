import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import LoadingSpinner from "./components/LoadingSpinner";//Your Provided Style


//Right now this either displays ugly patient data, or
function InstructorDashboard(){
    const [students, setStudents] = useState(null); //state for student data
    const [error, setError] = useState(null);   //state for error message
    const [isAuthenticated, setIsAuthenticated] = useState(true);//checks if user is authed or not
    const [view, setView] = useState("students");//sets for students
    const [userName, setUserName] = useState("")//set sthe username
    

    const navigate = useNavigate();


    //this useEffect runs when page renders
    //determines if user authenticated
    useEffect(() => {
        const userId = localStorage.getItem("userId");
        const isAdmin = localStorage.getItem("isAdmin")  === "true"; //get is admin and make it a bool

        if (!isAdmin ) {
            setIsAuthenticated(false);
            return;
        }
        console.log(userId);
        if (!userId) {
            console.error("User ID is not in local storage");
            setIsAuthenticated(false);
            return
        }
        fetch(`https://corewell-backend-production.up.railway.app/students/${userId}`,{
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
            setUserName(data.name)
        })
        .catch((error) => {
            console.error(error);
            setError("fetch user data failed");
        });
    }, []);
    //this useeffect runs whne we want to display students
    useEffect(() => {
        const token = localStorage.getItem("accessToken");//get access token
        const userId = localStorage.getItem("userId"); //gets teacher id
    
        if (!token || !userId) {
            setIsAuthenticated(false);
            return;
        }
    
        fetch(`https://corewell-backend-production.up.railway.app/instructors/${userId}/students`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },                
        })
        .then(response => {     //Bad token? error.
            if (!response.ok) {
                throw new Error("Invalid token");
            }
            return response.json();
        })
        .then(data => {         //Empty array returned? means bad token. error.
            if (Array.isArray(data) && data.length === 0) {
                throw new Error("Invalid token");
            }
            setIsAuthenticated(true);
            setStudents(data);
        })

        .catch(error => {       //Error? setIsAuthenticated to false to trip the mechanism for the login link
            console.error(error);
            setError("Failed student data fetch");
            setIsAuthenticated(false);
        });
    }, [isAuthenticated]);
    //if user isnt authed go back to login
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
        <>
        <div className="dashboard-container">
            {/* gray banner at top */}
            <div className="top-banner">
                <button
                    className="logout-but"
                    onClick={() => {
                        localStorage.removeItem("accessToken");
                        navigate("/"); // kick to login screen
                    }}
                >
                    Log Out
                </button>
                <button
                    className="logout-but"
                    onClick={() => navigate(`/FlaggedPatientsDash`)}
                >
                    Flagged Patients
                </button>
                {/* hardcoded for now sry */}
                <div className="welcome-message">
                    {userName ? `Welcome, ${userName}` : ""}
                </div>
            </div>
            
    
            
            {/* main */}    
            <div className="content">
                    {!isAuthenticated ? (
                        <div className="not-authenticated">
                            Sorry....you have no students
                        </div>
                    ) : (
                        <div className="data-section">
                            {view === "students" && (
                                <div>
                                    <h2>Student List</h2>
                                    {students ? (
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>   
                                                    <th>Email</th>
                                                    <th>Student Standing</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.map((student, index) => (
                                                    <tr 
                                                        key={index}
                                                        className="clickable-patient"
                                                        onClick={() => navigate(`/StudentDetails/${student.id}`)}


                                                    >
                                                        <td>{student.name}</td>
                                                        <td>{student.email}</td>
                                                        <td>{student.studentStanding}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <LoadingSpinner />
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
            
        </>
        
    )
}


}

export default InstructorDashboard;