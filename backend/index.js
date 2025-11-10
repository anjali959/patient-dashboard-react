const express = require("express");
const cors = require("cors");
const { PORT } = require("./config");
const app = express();
app.use(cors());
app.use(express.json());

const patientRoutes = require("./routes/patient");
app.use("/api/patient", patientRoutes); // paths: /api/patient/list, /api/patient/:id, /api/patient

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
