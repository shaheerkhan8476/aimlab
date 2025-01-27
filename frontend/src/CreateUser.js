import React, { useState } from 'react';

function CreateUser()
{
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
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
    return(
            
        <form onSubmit={handleSubmit}>
            <h1>This is where you create user hahahhahahaa</h1>
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

            <button type="submit">Sign up!</button>

        </form>
      






    )

}

export default CreateUser;