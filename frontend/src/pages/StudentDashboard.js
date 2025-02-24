import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./css/StudentDashboard.css";
import QuickReply from "../images/quick-reply.png"


//styling patient message and prescription page

function StudentDashboard(){
    const [messages, setMessages] = useState(null); //state for patient data
    const [prescriptions, setPrescriptions] = useState(null);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);   //state for error message
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [view, setView] = useState("messages"); //patient messages by default. swtich to prescriptions if clicked
    const [userName, setUserName] = useState("")
    

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

        fetch("http://localhost:8060/patients",{
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
            setMessages(data);
        })

        .catch(error => {       //Error? setIsAuthenticated to false to trip the mechanism for the login link
            console.error(error);
            setError("Failed patient data fetch");
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



    const fetchPrescriptions = () => {
        const token = localStorage.getItem("accessToken")

        if (!token) {
            setIsAuthenticated(false);
            return;
        }

        fetch("http://localhost:8060/prescriptions", {
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

    const fetchResults = () => {
        const token = localStorage.getItem("accessToken")

        if (!token) {
            setIsAuthenticated(false);
            return;
        }

        fetch("http://localhost:8060/results", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application.json",
            },
        })
        .then(response => response.json())
        .then(data => setResults(data))
        .catch(error => {
            console.error(error);
            setError("failed fetching results");
        });

    };

  


    return (
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
                {userName && <div className="welcome-message">Welcome, {userName}</div>}
                
            </div>

            {/* sidebar and main */}
            {/*sidebar*/}
            <div className="main-container">
                <div className="sidebar">
                    <h2>Dashboard</h2>
                    <button
                        className={`nav-link ${view === "messages" ? "active" : ""}`}
                        onClick={() => setView("messages")}
                    >
                        Patient Messages
                    </button>
                    <button
                        className={`nav-link ${view === "results" ? "active" : ""}`}
                        onClick={() => {
                        setView("results")
                        fetchResults();
                        }}
                    >
                        Results
                    </button>
                    <button
                        className={`nav-link ${view === "prescriptions" ? "active" : ""}`}
                        onClick={() => {
                            fetchPrescriptions();
                            setView("prescriptions");
                            
                        }}
                    >
                        Prescriptions/Refills
                    </button>
                </div>

                {/* main */}
                <div className="content">
                    {!isAuthenticated ? (
                        <div className="not-authenticated">
                            Uhhh... you're not supposed to be here. Come back when you're logged in, buddy boy
                        </div>
                    ) : (
                        <div className="data-section">
                            {view === "messages" && (
                                <div>
                                    <h2>Patient Messages</h2>
                                    {messages ? (
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>DOB</th>
                                                    <th>Message</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {messages.map((message, index) => (
                                                    <tr 
                                                        key={index}
                                                        className="clickable-patient"
                                                        onClick={() => navigate(`/PatientPage/${message.id}`)}

                                                    >
                                                        <td>{message.name}</td>
                                                        <td>{message.date_of_birth}</td>
                                                        <td>{message.patient_message}</td>
                                                        {/* <img src={QuickReply} alt="Quick Reply" className="quick-reply"></img> */}
                                                    </tr>
                                                ))}
                                                
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>...loading patient messages...</p>
                                    )}
                                </div>
                            )}

                            {view === "prescriptions" && (
                                <div>
                                    <h2>Prescriptions/Refills</h2>
                                    {prescriptions ? (
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Medication</th>
                                                    <th>Dose</th>
                                                    <th>Refill Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {prescriptions.map((prescription, index) => (
                                                    <tr key={index}
                                                        className="clickable-patient"
                                                        onClick={() => navigate(`/PatientPage/${prescription.patient_id}`)}
                                                    >
                                                        <td>{prescription.patient.name}</td>
                                                        <td>{prescription.medication}</td>
                                                        <td>{prescription.dose}</td>
                                                        <td>{prescription.refill_status}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>...loading prescriptions...</p>
                                    )}
                                </div>
                            )}

                            {view === "results" && (
                                <div>
                                <h2>Results</h2>
                                {results ? (
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Patient Name</th>
                                                <th>Test Name</th>
                                                <th>Test Date</th>
                                                
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((result, index) => (
                                                <tr key={index}
                                                    className="clickable-patient"
                                                    onClick={() => navigate(`/PatientPage/${result.patient_id}`)}
                                                >
                                                    <td>{result.patient.name}</td>
                                                    <td>{result.test_name}</td>
                                                    <td>{result.test_date}</td>
                                                    
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>...loading results...</p>
                                )}
                            </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );



}

export default StudentDashboard;