import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';


//Right now this either displays ugly patient data, or
function InstructorDashboard(){
    const [students, setStudents] = useState(null); //state for student data
    const [error, setError] = useState(null);   //state for error message
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [view, setView] = useState("students");
    const [userName, setUserName] = useState("Name McNameson")
    

    const navigate = useNavigate();


    //this useEffect runs when page renders
    //determines if user authenticated
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        
        if (!token) {
            setIsAuthenticated(false);
            return;
        }

        fetch("http://localhost:8060/students",{
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
    useEffect(() => {
        const userId = localStorage.getItem("userId");
        console.log(userId);
        if (!userId) {
            console.error("User ID is not in local storage");
            setIsAuthenticated(false);
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
            setUserName(data.name)
        })
        .catch((error) => {
            console.error(error);
            setError("fetch user data failed");
        });
    }, []);


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
                    onClick={() => navigate(`/FlaggedPaitents`)}
                >
                    Flagged Paitents
                </button>
                {/* hardcoded for now sry */}
                <div className="welcome-message">Welcome, {userName}</div>
            </div>
            
    
            
            {/* main */}    
            <div className="content">
                    {!isAuthenticated ? (
                        <div className="not-authenticated">
                            Uhhh... you're not supposed to be here. Come back when you're logged in, buddy boy
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
                                        <p>...loading patient messages...</p>
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

export default InstructorDashboard;