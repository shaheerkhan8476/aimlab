import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./css/Login.css";

function SignUpTeacher() {
    const [teachers, setTeachers] = useState([]);
    const [formData, setFormData] = useState({ instructor_id: "", student_id: "" });
    const [message, setMessage] = useState(""); 
    const navigate = useNavigate();

    useEffect(() => {
        fetch("http://localhost:8060/instructors")
            .then(response => response.json())
            .then(data => setTeachers(data))
            .catch(error => console.error("Error fetching instructors:", error));
    }, []);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8060/addStudent', {
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
                        <select className="styled-dropdown drop" name="instructor_id" value={formData.instructor_id} onChange={handleChange} required>
                            <option value="">Select an instructor</option>
                            {teachers.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit">Submit</button>
                </form>
                {message && <p className="confirmation-message">{message}</p>} 
            </div>
        </div>
    );
}

export default SignUpTeacher;
