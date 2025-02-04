import React, { useState } from 'react';

function CreateUser()
{
    //Create blank form for data user enters
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        isAdmin: null,
    });

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
        try {
            const response = await fetch('http://localhost:8080/addUser',{
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
    return(
            
        <form onSubmit={handleSubmit}>
            <h1>Create User:</h1>
            <label htmlFor="name">Name:</label>
            <input 
                type="text" 
                id="name" 
                name="name" 
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter name" 
                required>
             </input>

            <label htmlFor="email">Email:</label>
            <input 
                type="email" 
                id="email" 
                name="email" 
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email" 
                required>
            </input>

            <label htmlFor="password">Password:</label>
            <input 
                type="password" 
                id="password" 
                name="password" 
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password" 
                required>

            </input>
            <input 
                type="radio"
                name="isAdmin" 
                value= "true"
                checked={formData.isAdmin === true}
                onChange={handleChange}
                required>

            </input>
            <label htmlFor="Instructor">Instructor</label>
            <input 
                type="radio" 
                name="isAdmin"
                value = "false"
                checked={formData.isAdmin === false}
                onChange={handleChange}
                required>

            </input>
            <label htmlFor="Student">Student</label>
    


            <button type="submit">Sign up!</button>

        </form>
      


    )

}

export default CreateUser;