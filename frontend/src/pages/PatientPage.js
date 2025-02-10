import { useEffect, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import "./css/PatientPage.css";


function PatientPage() {
    const { id } = useParams(); //gets id from url
    const [patient, setPatient] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`http://localhost:8080/patients/${id}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                "Content-Type": "application/json",
            },
        })
        .then(response => {
            if (!response.ok){
                throw new Error("patient not found");
            }
            return response.json()
        })
        .then(data => setPatient(data))
        .catch(error => {
            console.error(error);
            setPatient(null);
        });
    }, [id]);

    return (
        <pre>
            {JSON.stringify(patient, null, 2)}
        </pre>
    );
}

export default PatientPage;