import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CreateUser from './pages/CreateUser';
import SignInUser from './pages/SignInUser';
import StudentDashboard from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import PatientPage from './pages/PatientPage';
import FlaggedPatientsDash from './pages/FlaggedPaitentsDash';
import StudentDetails from './pages/StudentDetails';
import FlaggedPatient from './pages/FlaggedPage';

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
        <Route path="/StudentDetails/:id" element={<StudentDetails />} />
        <Route path="/FlaggedPatientsDash" element={<FlaggedPatientsDash />} />
        <Route path="/FlaggedPatient/:id" element={<FlaggedPatient/>} />
      </Routes>
    </>
  );
  
};

export default App;
