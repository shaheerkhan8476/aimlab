import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import "./css/Login.css";//My Provided Style
function ResetPassword()
{
    //Create blank form for data user enters
    const [formData, setFormData] = useState({
        password: '',
        token: ''
    });
    const [message, setMessage] = useState(""); //sets the message to display
    const navigate = useNavigate();//used to navigate back to login

    //gets acess token from url with hash
    useEffect(() => {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const token = hashParams.get("access_token");
        if (token) {
            setFormData((prev) => ({ ...prev, token }));
        }
    }, []);

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
            const response = await fetch('http://localhost:8060/resetPassword',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accessToken: formData.token,  // Sends access token
                    newPassword: formData.password // sends new password
                }),
            });
            const responseText = await response.text();
            console.log("Response Data:", responseText);//for whatever reason doesnt work in if statement
            
            if (responseText.includes("Password updated successfully")) //used this instead of response.ok and works
            {
                setMessage("Password updated successfully"); 
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