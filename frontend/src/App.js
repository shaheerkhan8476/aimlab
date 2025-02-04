import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CreateUser from './pages/CreateUser';
import SignInUser from './pages/SignInUser';
import StudentDashboard from './pages/StudentDashboard';

//Main App entry point
function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<CreateUser />} />
        <Route path="/SignInUser" element={<SignInUser />} />
        <Route path="/StudentDashboard" element={<StudentDashboard />} />
      </Routes>
    </>
  );
  
};

export default App;
