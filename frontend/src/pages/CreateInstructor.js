import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import "./css/Login.css";
function CreateInstructor()
{
    //Create blank form for data user enters
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        isAdmin: true,
        studentStanding : null
    });
    const [message, setMessage] = useState(""); 
    const navigate = useNavigate();

    //Listen for user adjustment of html and apply to form
    const handleChange = (e) => {
        const { name, value,type } = e.target;
        setFormData({
            ...formData,
            [name]: type === "radio" ? value === "true" : value,
        });
    };

    //Handle submit button and make POST request to backend to run /addUser
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password.length < 6) {//if password less than 6 char
            setMessage("Password has to be at least 6 characters.");
            return;
        }
        try {
            const response = await fetch('https://corewell-backend-production.up.railway.app/addUser',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            if (response.ok) 
            {
                const data = await response.json();
                console.log('User created:', data);
                setMessage("Check your email for confirmation."); 
                setTimeout(() => navigate("/"), 3000); 
                
            }
            else
            {
                console.error('Failed to create user:', response.statusText);
            }
        }
        catch (error)
        {
            console.error('Error creating user:', error);
        }
    }
    //Render the HTML form so the user can interact
    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Instructor Sign Up</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" required />
                    </div>
                    <div className="input-group">
                        <label>Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required />
                    </div>
                    <button type="submit">Sign Up</button>
                </form>
                {message && <p className="confirmation-message">{message}</p>} {/* Display confirmation message */}
                <p>
                    Already have an account?
                    <span> </span>
                    <NavLink to="/">Log In</NavLink>
                </p>
            </div>
        </div>
    );
}

export default CreateInstructor;