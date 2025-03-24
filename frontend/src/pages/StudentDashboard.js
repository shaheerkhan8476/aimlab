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
        const userId = localStorage.getItem("userId");
        console.log("user id is", userId);
        if (!token) {
            setIsAuthenticated(false);
            console.log("ya goofed");
            return;
        }
        setIsAuthenticated(true);
        console.log("Fetching:", `http://localhost:8060/${userId}/tasks`);

        //Fetch all tasks for student
        fetch(`http://localhost:8060/${userId}/tasks`,{
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ get_incomplete_tasks: true, get_complete_tasks: false }),          
        })
        .then(response => {     //Bad token? error.
            if (!response.ok) {
                throw new Error("student task fetch failed!");
            }
            return response.json();
        })
        //In here for each task make necessary calls to that patient's informational api endpoints
        //to display the preview info on each dash tab
        .then(async (tasks) => {         //Empty array returned? means bad token. error.
            console.log("tasks fetched successfully", tasks);

            tasks.forEach(task => {
                console.log(`Task ID: ${task.task_id}, Type: ${task.task_type}, Result ID: ${task.result_id}`);
            });

            const patientMessages = tasks.filter(task => task.task_type === "patient_question");
            const results = tasks.filter(task => task.task_type === "lab_result");
            const prescriptions = tasks.filter(task => task.task_type === "prescription");

            console.log("Filtered results tasks:", results);

            setIsAuthenticated(true);

            const fetchPatientMessage = async (taskList) => {
                return Promise.all(taskList.map(async (task) => {
                    const fullPatient = await fetch(`http://localhost:8060/patients/${task.patient_id}`, {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    });
                    const patientData = await fullPatient.json();
                    return { ...task, patient: patientData };
                }))
            };

            //async to ensure api calls all get through before it tries to move on
            const fetchPrescriptions = async (taskList) => {
                return Promise.all(taskList.map(async (task) => {
                    const fullPrescription = await fetch(`http://localhost:8060/prescriptions/${task.prescription_id}`,{
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }).then(res => res.json()).catch(err => {
                        console.error(`failed to fetch prescription, id is ${task.prescription_id}`, err);
                        return null;
                    });

                    if (!fullPrescription) {return;} //do nothing if prescription null, bc that means it must be not prescrip task

                    return {
                        ...task,
                        prescription: fullPrescription,
                        patient: {name: fullPrescription.patient.name}
                    };
                }));
            };

            const fetchResults = async (taskList) => {
                return Promise.all(taskList.map(async (task) => {

                    console.log(`Fetching result for task ${task.task_id} with result_id: ${task.result_id}`);

                    const fullResult = await fetch(`http://localhost:8060/results/${task.result_id}`, {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }).then(res => res.json()).catch(err => {
                        console.error(`failed fetching result with id ${task.result_id}`, err);
                        return null;
                    });

                    if (!fullResult) return;  //dont do anything if the call returns null that means it's probably not result task

                    return {
                        ...task,
                        result: fullResult,
                        patient: { name: fullResult.patient.name }
                    };
                }));
            };

            const realMessages = await fetchPatientMessage(patientMessages);
            const realResults = await fetchResults(results);
            const realPrescriptions = await fetchPrescriptions(prescriptions);

            setMessages(realMessages);
            setResults(realResults);
            setPrescriptions(realPrescriptions);
            
        })

        .catch(error => {       //Error? setIsAuthenticated to false to trip the mechanism for the login link
            console.error(error);
            setError("Failed patient data fetch");
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
            localStorage.setItem("userName", data.name)
        })
        .catch((error) => {
            console.error(error);
            setError("fetch user data failed");
        });
    }, []);


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
                        }}
                    >
                        Results
                    </button>
                    <button
                        className={`nav-link ${view === "prescriptions" ? "active" : ""}`}
                        onClick={() => {
                            setView("prescriptions");
                            
                        }}
                    >
                        Prescriptions/Refills
                    </button>
                    <button
                        className="nav-link"
                        onClick={() => navigate(`/StudentDetails/${localStorage.getItem("userId")}`)}
                    >
                        Previous Tasks
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
                                                        onClick={() => navigate(`/PatientPage/${message.patient_id}`, 
                                                            {state: {task_type: "patient_question", patient_question: message.patient.patient_message}})}

                                                    >
                                                        <td>{message.patient.name}</td>
                                                        <td>{message.patient.date_of_birth}</td>
                                                        <td>{message.patient.patient_message}</td>
                                                        {/* <img src={QuickReply} alt="Quick Reply" className="quick-reply"></img> */}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No messages tasks!</p>
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
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {prescriptions.map((prescription, index) => (
                                                    <tr key={index}
                                                        className="clickable-patient"
                                                        onClick={() => navigate(`/PatientPage/${prescription.patient_id}`, {
                                                            state: {
                                                                task_type: "prescription",
                                                                prescription_id: prescription.prescription_id
                                                            }
                                                        })}
                                                    >
                                                        <td>{prescription.patient ? prescription.patient.name : "Unknown"}</td>
                                                        <td>{prescription.prescription ? prescription.prescription.medication : "No medication"}</td>
                                                        <td>{prescription.prescription ? prescription.prescription.dose : "No dose"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p>No prescriptions tasks!</p>
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
                                                    onClick={() => {
                                                        console.log("Navigating to PatientPage with task:", {
                                                            task_type: "lab_result",
                                                            result_id: result.result_id,
                                                        });                                         
                                                        
                                                        
                                                        
                                                        navigate(`/PatientPage/${result.patient_id}`, {
                                                        state: {
                                                            task_type: "lab_result",
                                                            result_id: result.result_id
                                                        }
                                                    });}}
                                                >
                                                    <td>{result.patient ? result.patient.name : "Unknown"}</td>
                                                    <td>{result.result ? result.result.test_name : "No test name"}</td>
                                                    <td>{result.result ? result.result.test_date : "No test date"}</td>
                                                    
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>No results tasks!</p>
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