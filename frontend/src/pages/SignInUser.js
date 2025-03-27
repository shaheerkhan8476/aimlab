import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import "./css/Login.css";

function SignInUser()
{
    //Current User Data
    const [loginData, setLoginData] = useState({
        email: '',
        password: '',
     });

     //For error stuff if login fail
     const [error, setError] = useState(""); //state for error msg
     const navigate = useNavigate();

     //Listen for user adjustment of html and apply to form
    const handleChange = (e) => {
        const { name, value } = e.target;
        setLoginData({
            ...loginData,
            [name]: value,
        });
    };
    //Handle submit button and make POST request to backend to run /login
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const response = await fetch('https://corewell-backend-production.up.railway.app/login',{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData),
            });

            if (response.ok) 
            {
                const data = await response.json();
                const token = data.access_token;
                const userId = data.user.id;
                localStorage.setItem("accessToken", token);
                localStorage.setItem("isAdmin", loginData.isAdmin);
                localStorage.setItem("isAssigned", loginData.isAssigned);
                localStorage.setItem("userEmail", loginData.email);
                localStorage.setItem("userPassword", loginData.password);
                localStorage.setItem("userId", userId);
                console.log('Login Successful', data);

                const userResponse = await fetch(`https://corewell-backend-production.up.railway.app/students/${userId}`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                const userData = await userResponse.json();
                
                const isAdmin = userData.isAdmin;
                localStorage.setItem("isAdmin", isAdmin);
                
                const isAssigned = userData.isAssigned;
                localStorage.setItem("isAssigned", isAssigned);

                if(!isAdmin && !isAssigned)
                {
                    navigate("/SignUpTeacher")
                }
                else if (isAdmin) {
                    navigate("/InstructorDashboard");
                }
                else {
                    navigate("/StudentDashboard");
                }

                
            }
            else
            {
                setError(response.statusText || "Login failed. Try again!")
                console.error('Failed to login', response.statusText);
            }
        }
        catch (error)
        {
            setError("Failed login!")
            console.error('Error logining user', error);
        }
        
    }



    //Render the HTML form so the user can interact
    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Log In</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={loginData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            required/>
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={loginData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required/>
                    </div>
                    <button type="submit">Login</button>
                </form>
                <p> Don't have an account?
                    <span> </span>
                    <span  className="signup-link" 
                        onClick={() => {
                            navigate("/CreateUser");
                        }}>Sign up</span>
                </p>
                <p> Forgot Password?
                    <span> </span>
                    <span  className="signup-link" 
                        onClick={() => {
                            navigate("/ForgotPassword");
                        }}>Click here</span>
                </p>

            </div>
        </div>
    );
}

export default SignInUser;