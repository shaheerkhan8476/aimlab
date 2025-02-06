import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import "./css/StudentDashboard.css";


//Right now this either displays ugly patient data, or
//A link to go back to login page if no permission to see
//ugly patient data
function StudentDashboard(){
    const [patients, setPatients] = useState(null); //state for patient data
    const [prescriptions, setPrescriptions] = useState(null);
    const [error, setError] = useState(null);   //state for error message
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [view, setView] = useState("patients"); //patient data by default. swtich to prescriptions if clicked
    

    const navigate = useNavigate();


    //this useEffect runs when page renders
    //determines if user authenticated
    //shows patient data if yes
    //link back to login page if no
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        
        if (!token) {
            setIsAuthenticated(false);
            return;
        }

        fetch("http://localhost:8080/patients",{
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
            setPatients(data);
        })

        .catch(error => {       //Error? setIsAuthenticated to false to trip the mechanism for the login link
            console.error(error);
            setError("Failed patient data fetch");
            setIsAuthenticated(false);
        });
    }, [isAuthenticated]);



    const fetchPrescriptions = () => {
        const token = localStorage.getItem("accessToken")

        if (!token) {
            setIsAuthenticated(false);
            return;
        }

        fetch("http://localhost:8080/prescriptions", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application.json",
            },
        })
        .then(response => response.json())
        .then(data => setPrescriptions(data))
        .catch(error => {
            console.error(error);
            setError("failed fetching prescriptions");
        });

    };



    return (
        <>
            <h1>Student Dashboard</h1>
            <button onClick={() => {
                    localStorage.removeItem("accessToken");
                    navigate(0);    //cheeky way to refresh
                }}
            > 
            Log Out </button>

            <button className="patients-button" onClick={() => setView("patients")}>Patients</button>
            <button onClick={() => { setView("prescriptions"); fetchPrescriptions();}}>Prescriptions</button>
            
            {!isAuthenticated ? ( //If not authenticated, present link to login page
                <div>
                    <NavLink to="/SignInUser">
                        If you see this, you're probably not logged in. Click here to log in.
                    </NavLink>
                </div>
            ) : (           //If authenticated, show patient or prescription view
                <div>
                    {view === "patients" && (  
                        <div>
                            <h2>Patient Data</h2>
                            <pre>{JSON.stringify(patients, null, 2)}</pre>
                        </div>
                    )}

                    {view === "prescriptions" && (
                        <div>
                            <h2>Prescription Data</h2>
                            <pre>{JSON.stringify(prescriptions, null, 2)}</pre>
                        </div>
                    )}
                </div>
            )}
        </>
    )


}

export default StudentDashboard;