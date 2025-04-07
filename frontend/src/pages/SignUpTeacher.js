import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./css/Login.css";//My Provided Style

function SignUpTeacher() {
    const [teachers, setTeachers] = useState([]);//sets the teacheher
    const [formData, setFormData] = useState({ instructor_id: "", student_id: "" });//sets the ids
    const [message, setMessage] = useState(""); //shows messages
    const navigate = useNavigate();// naviagte back to login

    //runs to get instrctors
    useEffect(() => {
        fetch("https://corewell-backend-production.up.railway.app/instructors")
            .then(response => response.json())
            .then(data => setTeachers(data))
            .catch(error => console.error("Error fetching instructors:", error));
    }, []);

    //runs to get the user id
    useEffect(() => {
        const userId = localStorage.getItem("userId");
        console.log("User ID:", userId);
        if (!userId) {
            console.error("User ID is not in local storage");
            return;
        }
        setFormData(prevData => ({ ...prevData, student_id: userId }));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    //adds the student to teacher
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('https://corewell-backend-production.up.railway.app/addStudent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                setMessage("Student assigned successfully.");
                setTimeout(() => navigate("/StudentDashboard"), 3000);
            } else {
                console.error('Failed to assign student:', response.statusText);
            }
        } catch (error) {
            console.error('Error assigning student:', error);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Select Instructor</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group student-standing-group">
                        <label className="student-standing-label">Choose Instructor</label>
                        <div className="radio-group">
                            {teachers.map((teacher) => (
                                <div key={teacher.id} className="radio-option">
                                    <input type="radio" id={`teacher-${teacher.id}`} name="instructor_id"
                                        value={teacher.id} checked={formData.instructor_id === teacher.id.toString()}
                                        onChange={handleChange} required />
                                    <label htmlFor={`teacher-${teacher.id}`}> {teacher.name} <br  /> {teacher.email}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit">Submit</button>
                </form>
                {message && <p className="confirmation-message">{message}</p>} 
            </div>
        </div>
    );
}

export default SignUpTeacher;
