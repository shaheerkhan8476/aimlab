import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CreateUser from './pages/CreateUser';
import SignInUser from './pages/SignInUser';
import StudentDashboard from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import PatientPage from './pages/PatientPage';
import StudentDetails from './pages/StudentDetails';

//Main App entry point
function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<SignInUser />} />
        <Route path="/CreateUser" element={<CreateUser />} />
        <Route path="/StudentDashboard" element={<StudentDashboard />} />
        <Route path="/InstructorDashboard" element={<InstructorDashboard />} />
        <Route path="/PatientPage/:id" element={<PatientPage />} />
        <Route path="/StudentDetails/:id" element={<StudentDetails />} />
      </Routes>
    </>
  );
  
};

export default App;
