import React, { useState } from 'react';

function SignInUser()
{
    //Current User Data
    const [loginData, setLoginData] = useState({
        email: '',
        password: '',
     });
     
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
        try {
            const response = await fetch('http://localhost:8080/login',{
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
                localStorage.setItem("accessToken", token);
                console.log('Login Successful', data);
            }
            else
            {
                console.error('Failed to login', response.statusText);
            }
        }
        catch (error)
        {
            console.error('Error logining user', error);
        }
    }

    //Render the HTML form so the user can interact
    return(
            
        <form onSubmit={handleSubmit}>
            <h1>Login:</h1>
            
            <label htmlFor="email">Email:</label>
            <input 
                type="email" 
                id="email" 
                name="email" 
                value={loginData.email}
                onChange={handleChange}
                placeholder="Enter email" 
                required>
            </input>

            <label htmlFor="password">Password:</label>
            <input 
                type="password" 
                id="password" 
                name="password" 
                value={loginData.password}
                onChange={handleChange}
                placeholder="Enter password" 
                required>

            </input>

            <button type="submit">Login!</button>

        </form>
      


    )



}

export default SignInUser;