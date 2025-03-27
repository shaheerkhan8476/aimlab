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

    const [messageCount, setMessageCount] = useState(0);
    const [resultCount, setResultCount] = useState(0);
    const [prescriptionCount, setPrescriptionCount] = useState(0);

    const [showQuickReply, setShowQuickReply] = useState(null);
    const [quickReplyText, setQuickReplyText] = useState("");
    

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
        console.log("Fetching:", `https://team-corewell-frontend.vercel.app/${userId}/tasks`);

        //Fetch all tasks for student
        fetch(`https://team-corewell-frontend.vercel.app/${userId}/tasks`,{
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

            // tasks.forEach(task => {
            //     console.log(`Task ID: ${task.id}, Type: ${task.task_type}, Result ID: ${task.result_id}`);
            // });

            const patientMessages = tasks.filter(task => task.task_type === "patient_question");
            setMessageCount(patientMessages.length);

            const results = tasks.filter(task => task.task_type === "lab_result");
            setResultCount(results.length);

            const prescriptions = tasks.filter(task => task.task_type === "prescription");
            setPrescriptionCount(prescriptions.length);



            console.log("Filtered results tasks:", results);

            setIsAuthenticated(true);

            const fetchPatientMessage = async (taskList) => {
                return Promise.all(taskList.map(async (task) => {
                    const fullPatient = await fetch(`https://team-corewell-frontend.vercel.app/patients/${task.patient_id}`, {
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
                    const fullPrescription = await fetch(`https://team-corewell-frontend.vercel.app/prescriptions/${task.prescription_id}`,{
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

                    //console.log(`Fetching result for task ${task.id} with result_id: ${task.result_id}`);

                    const fullResult = await fetch(`https://team-corewell-frontend.vercel.app/results/${task.result_id}`, {
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


    //Gets username -- admittedly there's either a better way to do this or
    //There isn't and I forgot why this is necessary because I did it so long ago
    useEffect(() => {
        const userId = localStorage.getItem("userId");
        console.log(userId);
        if (!userId) {
            console.error("User ID is not in local storage");
            setIsAuthenticated(false);
            return
        }
        fetch(`https://team-corewell-frontend.vercel.app/students/${userId}`,{
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

    const handleQuickReplySubmit = async (task) => {
        const token = localStorage.getItem("accessToken");
        const userId = localStorage.getItem("userId");

        if (!quickReplyText.trim()) {return;}

        try {
            await fetch(`https://team-corewell-frontend.vercel.app/${userId}/tasks/${task.id}/completeTask`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    student_response: quickReplyText,
                    llm_feedback: ""
                })
            });

            setMessages((prev) => prev.filter((msg) => msg.id !== task.id));
            setMessageCount((prev) => prev - 1);

            setShowQuickReply(null);
            setQuickReplyText("");
        }
        catch (error) {
            console.error("quick reply screwed up", error);
        }
        }


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
                        Patient Messages ({messageCount})
                    </button>
                    <button
                        className={`nav-link ${view === "results" ? "active" : ""}`}
                        onClick={() => {
                        setView("results")
                        }}
                    >
                        Results ({resultCount})
                    </button>
                    <button
                        className={`nav-link ${view === "prescriptions" ? "active" : ""}`}
                        onClick={() => {
                            setView("prescriptions");
                            
                        }}
                    >
                        Prescriptions/Refills ({prescriptionCount})
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
                                    {messages === null ? (
                                        <p>...Loading...</p> ) : messages.length === 0 ?
                                        ( <p>No messages tasks! Good job!</p>) : (
                                        <>
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
                                                    <>
                                                    <tr 
                                                        key={index}
                                                        className="clickable-patient"
                                                        onClick={() => navigate(`/PatientPage/${message.patient_id}`, 
                                                            {state: {
                                                                task_type: "patient_question", 
                                                                patient_question: message.patient.patient_message,
                                                                task_id: message.id}})}

                                                    >
                                                        <td>{message.patient.name}</td>
                                                        <td>{message.patient.date_of_birth}</td>
                                                        <td>{message.patient.patient_message}</td>
                                                        <td>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowQuickReply(message);
                                                                        setQuickReplyText("");
                                                                    }}
                                                                >               
                                                                    Quick Reply
                                                                </button>
                                                        </td>
                                                    </tr>
                                                    {showQuickReply?.id === message.id && (
                                                        <tr>
                                                            <td colSpan="4">
                                                                <div className="quick-reply-box">
                                                                    <textarea
                                                                        value={quickReplyText}
                                                                        onChange={(e) => setQuickReplyText(e.target.value)}
                                                                        placeholder="Reply quickly here..."
                                                                    />
                                                                    <div>
                                                                        <button onClick={() => handleQuickReplySubmit(message)}>Submit</button>
                                                                        <button onClick={() => setShowQuickReply(null)}>Cancel</button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                                ))}
                                            </tbody>
                                        </table>
                                        {showQuickReply && (
                                            <div className="quick-reply-box">
                                              <textarea
                                                value={quickReplyText}
                                                onChange={(e) => setQuickReplyText(e.target.value)}
                                                placeholder="Type your quick reply here..."
                                              />
                                              <div>
                                                <button onClick={() => handleQuickReplySubmit(showQuickReply)}>Submit</button>
                                                <button onClick={() => setShowQuickReply(null)}>Cancel</button>
                                              </div>
                                            </div>
                                          )}
                                        </>
                                    )}
                                </div>
                            )}

                            {view === "prescriptions" && (
                                <div>
                                    <h2>Prescriptions/Refills</h2>
                                    {prescriptions === null ? (
                                        <p>...Loading...</p> ) :
                                        prescriptions.length === 0 ? (
                                            <p>No prescriptions tasks! Good job!</p>
                                        ) : (
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
                                                                prescription_id: prescription.prescription_id,
                                                                task_id: prescription.id
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
                                    )}
                                </div>
                            )}

                            {view === "results" && (
                                <div>
                                <h2>Results</h2>
                                {results === null ? (
                                    <p>...Loading...</p> ) :
                                    prescriptions.length === 0 ? (
                                        <p>No prescriptions tasks! Good job!</p>
                                    ) : (
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
                                                            result_id: result.result_id,
                                                            task_id: result.id
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