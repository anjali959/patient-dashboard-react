import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import 'bootstrap/dist/css/bootstrap.min.css';

export default function PatientsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/patient/list");
      setItems(res.data.data || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Patients</h2>
        <button className="btn btn-outline-secondary" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="card">
        <div className="card-body table-responsive">
          <table className="table table-bordered table-sm align-middle">
            <thead>
              <tr className="text-center">
                <th style={{minWidth:60}}>ID</th>
                <th style={{minWidth:200}}>Name</th>
                <th style={{minWidth:80}}>Gender</th>
                <th style={{minWidth:80}}>Age</th>
                <th style={{minWidth:130}}>DOB</th>
                <th style={{minWidth:100}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id}>
                  <td className="text-center">{p.id}</td>
                  <td>{p.name}</td>
                  <td className="text-center">{p.gender}</td>
                  <td className="text-center">{p.age}</td>
                  <td className="text-center">{p.date_of_birth}</td>
                  <td className="text-center">
                    <Link className="btn btn-primary btn-sm" to={`/patient/${p.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted">No patients</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
