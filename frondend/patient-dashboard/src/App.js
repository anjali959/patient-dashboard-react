import { Routes, Route, Navigate, Link } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Patient from "./pages/Patient";
import PatientsList from "./pages/PatientsList";

export default function App() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="flex-grow-1">
        <div className="container mt-3 mb-2">
          <Link to="/patients" className="btn btn-outline-dark btn-sm me-2">All Patients</Link>
          <Link to="/patient" className="btn btn-outline-dark btn-sm">Jessica (default)</Link>
        </div>
        <Routes>
          <Route path="/" element={<Navigate to="/patients" replace />} />
          <Route path="/patients" element={<PatientsList />} />
          <Route path="/patient" element={<Patient />} />         {/* fallback: Jessica */}
          <Route path="/patient/:id" element={<Patient />} />     {/* detail by id */}
          <Route path="*" element={<div className="container py-4">Not Found</div>} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
