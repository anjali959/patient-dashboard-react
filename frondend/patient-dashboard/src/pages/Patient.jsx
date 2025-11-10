import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import 'bootstrap/dist/css/bootstrap.min.css';

function formatDate(dob){ if(!dob) return "-"; const dt=new Date(dob); const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,"0"); const d=String(dt.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; }
const MONTH_ORDER=["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Patient() {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState(null);
  const [msg, setMsg] = useState("");

  const loadFromDB = async () => {
    try {
      setLoading(true);
      const url = id ? `/api/patient/${id}` : `/api/patient`; // if no id, fallback to Jessica
      const res = await api.get(url);
      setPatient(res.data.data);
    } catch (e) {
      console.error(e);
      setMsg("Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  const syncFromCoalition = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/patient/fetch");
      setMsg(res.data.message || "Synced");
      await loadFromDB();
    } catch (e) {
      console.error(e);
      setMsg("Sync failed");
    } finally {
      setLoading(false);
      setTimeout(()=>setMsg(""),3000);
    }
  };

  useEffect(() => { loadFromDB(); }, [id]);

  const sortedHistory = useMemo(() => {
    if (!patient?.diagnosis_history) return [];
    const copy = [...patient.diagnosis_history];
    copy.sort((a,b)=>{
      if (b.year !== a.year) return b.year - a.year;
      return MONTH_ORDER.indexOf(b.month) - MONTH_ORDER.indexOf(a.month);
    });
    return copy;
  }, [patient]);

  if (loading && !patient) return <div className="container py-4">Loading...</div>;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Patient</h2>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={loadFromDB} disabled={loading}>Refresh</button>
          <button className="btn btn-primary" onClick={syncFromCoalition} disabled={loading}>{loading? "Syncing..." : "Sync from Coalition API"}</button>
        </div>
      </div>
      {msg && <div className="alert alert-info">{msg}</div>}
      {!patient && <div className="text-muted">No data.</div>}
      {patient && (
        <>
          <div className="card mb-4">
            <div className="card-body d-flex flex-wrap align-items-center gap-3">
              <img src={patient.profile_picture} alt={patient.name} style={{width:96,height:96,borderRadius:"50%",objectFit:"cover"}} />
              <div>
                <h3 className="mb-1">{patient.name}</h3>
                <div className="text-muted">{patient.gender} • {patient.age} yrs • DOB: {formatDate(patient.date_of_birth)}</div>
                <div className="mt-2">
                  <div><strong>Phone:</strong> {patient.phone_number}</div>
                  <div><strong>Emergency Contact:</strong> {patient.emergency_contact}</div>
                  <div><strong>Insurance:</strong> {patient.insurance_type}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnosis History */}
          <div className="card mb-4">
            <div className="card-header bg-light"><strong>Diagnosis History</strong></div>
            <div className="card-body table-responsive">
              <table className="table table-sm table-bordered align-middle">
                <thead>
                  <tr className="text-center">
                    <th>Month</th><th>Year</th><th>Blood Pressure</th><th>Heart Rate</th><th>Respiratory Rate</th><th>Temperature</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistory.map(h=>(
                    <tr key={h.id}>
                      <td>{h.month}</td>
                      <td className="text-center">{h.year}</td>
                      <td className="text-center">
                        {h.systolic_value}/{h.diastolic_value}
                        <div className="small text-muted">S: {h.systolic_level}, D: {h.diastolic_level}</div>
                      </td>
                      <td className="text-center">{h.heart_rate}</td>
                      <td className="text-center">{h.respiratory_rate}</td>
                      <td className="text-center">{h.temperature}</td>
                    </tr>
                  ))}
                  {sortedHistory.length===0 && <tr><td colSpan={6} className="text-center text-muted">No records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnostic List + Lab Results */}
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card h-100">
                <div className="card-header bg-light"><strong>Diagnostic List</strong></div>
                <div className="card-body table-responsive">
                  <table className="table table-sm table-bordered">
                    <thead><tr className="text-center"><th>Name</th><th>Status</th><th>Description</th></tr></thead>
                    <tbody>
                      {patient.diagnostic_list?.map(d=>(
                        <tr key={d.id}><td>{d.name}</td><td className="text-center">{d.status}</td><td>{d.description}</td></tr>
                      ))}
                      {(!patient.diagnostic_list||patient.diagnostic_list.length===0) && <tr><td colSpan={3} className="text-center text-muted">No items</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="card h-100">
                <div className="card-header bg-light"><strong>Lab Results</strong></div>
                <div className="card-body">
                  {patient.lab_results?.length>0 ? (
                    <ul className="list-group">
                      {patient.lab_results.map((lr,i)=>(<li key={`${lr}-${i}`} className="list-group-item">{lr}</li>))}
                    </ul>
                  ) : <div className="text-muted">No lab results</div>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
