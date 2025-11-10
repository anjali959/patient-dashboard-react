const express = require("express");
const axios = require("axios");
const pool = require("../db");
const { COALITION_API, AUTH_USERNAME, AUTH_PASSWORD } = require("../config");

const router = express.Router();

/**
 * GET /api/patients
 * Return a lightweight list for the UI
 */
router.get("/list", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, gender, age, DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS date_of_birth
       FROM patients
       ORDER BY name ASC`
    );
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * GET /api/patient/:id
 * Return full detail of a patient by id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [patient] = await pool.query(
      `SELECT id, name, gender, age, profile_picture,
              DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS date_of_birth,
              phone_number, emergency_contact, insurance_type
       FROM patients WHERE id=?`,
      [id]
    );

    if (patient.length === 0) return res.status(404).json({ message: "No patient found" });

    const patientId = patient[0].id;

    const [diagnosis] = await pool.query(
      `SELECT * FROM diagnosis_history WHERE patient_id=? ORDER BY year DESC,
       FIELD(month,'January','February','March','April','May','June','July','August','September','October','November','December') DESC`,
      [patientId]
    );
    const [diagnosticList] = await pool.query(
      "SELECT * FROM diagnostic_list WHERE patient_id=?",
      [patientId]
    );
    const [labResults] = await pool.query(
      "SELECT result_name FROM lab_results WHERE patient_id=?",
      [patientId]
    );

    res.json({
      status: "success",
      data: {
        ...patient[0],
        diagnosis_history: diagnosis,
        diagnostic_list: diagnosticList,
        lab_results: labResults.map((r) => r.result_name),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * Backward-compat: GET /api/patient
 * Return Jessica by default (first match) so your existing UI still works
 */
router.get("/", async (req, res) => {
  try {
    const [patient] = await pool.query(
      `SELECT id, name, gender, age, profile_picture,
              DATE_FORMAT(date_of_birth, '%Y-%m-%d') AS date_of_birth,
              phone_number, emergency_contact, insurance_type
       FROM patients
       WHERE name='Jessica Taylor'
       ORDER BY id ASC LIMIT 1`
    );
    if (patient.length === 0) return res.status(404).json({ message: "No patient found" });

    const patientId = patient[0].id;

    const [diagnosis] = await pool.query(
      `SELECT * FROM diagnosis_history WHERE patient_id=? ORDER BY year DESC,
       FIELD(month,'January','February','March','April','May','June','July','August','September','October','November','December') DESC`,
      [patientId]
    );
    const [diagnosticList] = await pool.query(
      "SELECT * FROM diagnostic_list WHERE patient_id=?",
      [patientId]
    );
    const [labResults] = await pool.query(
      "SELECT result_name FROM lab_results WHERE patient_id=?",
      [patientId]
    );

    res.json({
      status: "success",
      data: {
        ...patient[0],
        diagnosis_history: diagnosis,
        diagnostic_list: diagnosticList,
        lab_results: labResults.map((r) => r.result_name),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * GET /api/patient/fetch
 * (existing) fetch Jessica from Coalition API and upsert by name
 */
router.get("/fetch", async (req, res) => {
  try {
    const authKey = Buffer.from(`${AUTH_USERNAME}:${AUTH_PASSWORD}`).toString("base64");
    const response = await axios.get(COALITION_API, {
      headers: { Authorization: `Basic ${authKey}` },
    });

    const allPatients = response.data;
    const jessica = allPatients.find((p) => p.name === "Jessica Taylor");
    if (!jessica) return res.status(404).json({ message: "Jessica Taylor not found" });

    // Convert date
    let dob = null;
    if (jessica.date_of_birth) {
      const parts = jessica.date_of_birth.split("/");
      dob = `${parts[2]}-${parts[0]}-${parts[1]}`;
    }

    // Check if she already exists (first match by name)
    const [existing] = await pool.query("SELECT id FROM patients WHERE name=? ORDER BY id ASC LIMIT 1", [jessica.name]);

    let patientId;
    if (existing.length > 0) {
      patientId = existing[0].id;
      await pool.query(
        `UPDATE patients SET gender=?, age=?, profile_picture=?, date_of_birth=?, phone_number=?, emergency_contact=?, insurance_type=? WHERE id=?`,
        [jessica.gender, jessica.age, jessica.profile_picture, dob, jessica.phone_number, jessica.emergency_contact, jessica.insurance_type, patientId]
      );
    } else {
      const [ins] = await pool.query(
        `INSERT INTO patients (name, gender, age, profile_picture, date_of_birth, phone_number, emergency_contact, insurance_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [jessica.name, jessica.gender, jessica.age, jessica.profile_picture, dob, jessica.phone_number, jessica.emergency_contact, jessica.insurance_type]
      );
      patientId = ins.insertId;
    }

    // Replace child tables
    await pool.query("DELETE FROM diagnosis_history WHERE patient_id=?", [patientId]);
    for (const d of jessica.diagnosis_history || []) {
      await pool.query(
        `INSERT INTO diagnosis_history (patient_id, month, year, systolic_value, systolic_level, diastolic_value, diastolic_level, heart_rate, respiratory_rate, temperature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          d.month,
          d.year,
          d.blood_pressure.systolic.value,
          d.blood_pressure.systolic.levels,
          d.blood_pressure.diastolic.value,
          d.blood_pressure.diastolic.levels,
          d.heart_rate.value,
          d.respiratory_rate.value,
          d.temperature.value,
        ]
      );
    }

    await pool.query("DELETE FROM diagnostic_list WHERE patient_id=?", [patientId]);
    for (const diag of jessica.diagnostic_list || []) {
      await pool.query(
        `INSERT INTO diagnostic_list (patient_id, name, description, status) VALUES (?, ?, ?, ?)`,
        [patientId, diag.name, diag.description, diag.status]
      );
    }

    await pool.query("DELETE FROM lab_results WHERE patient_id=?", [patientId]);
    for (const lr of jessica.lab_results || []) {
      await pool.query(`INSERT INTO lab_results (patient_id, result_name) VALUES (?, ?)`, [patientId, lr]);
    }

    res.json({ status: "success", message: "Jessica Taylor data saved to database", id: patientId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
