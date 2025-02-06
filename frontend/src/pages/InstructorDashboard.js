import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';


//Right now this either displays ugly patient data, or
function InstructorDashboard(){
    const [students, setStudents] = useState(null); //state for student data
    const [error, setError] = useState(null);   //state for error message
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [view, setView] = useState("students");
    

    const navigate = useNavigate();


    //this useEffect runs when page renders
    //determines if user authenticated
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        
        if (!token) {
            setIsAuthenticated(false);
            return;
        }

        fetch("http://localhost:8080/students",{
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


    return (
        <>
            <h1>Instructor Dashboard</h1>
            <button onClick={() => {
                localStorage.removeItem("accessToken");
                navigate(0);
            }}> Log Out </button>

            <button onClick={() => setView("students")}>Students</button>
    
            
            {!isAuthenticated ? ( //If not authenticated, present link to login page
                <div>
                    <NavLink to="/SignInUser">
                        If you see this, you're probably not logged in. Click here to log in.
                    </NavLink>
                </div>
            ) : (           //If authenticated, show students
                <div>
                    {view === "students" && (  
                        <div>
                            <h2>Student Data</h2>
                            <pre>{JSON.stringify(students, null, 2)}</pre>
                        </div>
                    )}
                </div>
            )}
        </>
    )


}

export default InstructorDashboard;