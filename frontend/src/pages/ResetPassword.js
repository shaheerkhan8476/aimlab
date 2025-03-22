import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import "./css/Login.css";
function ResetPassword()
{
    //Create blank form for data user enters
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [message, setMessage] = useState(""); 
    const navigate = useNavigate();

    //Listen for user adjustment of html and apply to form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
            
        });
    };

    //Handle submit button and make POST request to backend to run /forgotPassword
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8060/resetPassword"',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            const responseText = await response.text();
            console.log("Response Data:", responseText);//for whatever reason doesnt work in if statement
            
            if (responseText.includes("Reset password link sent (if email is valid)")) //used this instead of response.ok and works
            {
                setMessage("Check your email to reset password."); 
                setTimeout(() => navigate("/"), 3000); 
            }
            else
            {
                console.error('Failed to reset password:', response.statusText);
            }
        }
        catch (error)
        {
            console.error('Error getting user:', error);
        }
    }
    //Render the HTML form so the user can interact
    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Reset Password</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your new password"required/>
                    </div>
                    <button type="submit">Reset Password</button>
                </form>
                {message && <p className="confirmation-message">{message}</p>} 
                <p>
                    Remembered Password?
                    <span> </span>
                    <NavLink to="/">Log In</NavLink>
                </p>
            </div>
        </div>
    );
}

export default ResetPassword;