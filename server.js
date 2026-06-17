import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { dbConnect } from './config/dbConnection.js';

import docRoutes from './routes/docRoutes.js';
import patientRoutes from './routes/patRoutes.js';
import doctorProfileRoutes from './routes/DocProfileRoutes.js';
import doctorVerificationRoutes from './routes/docVerificationRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import callRoutes from './routes/callRoutes.js';
import patientProfileRoutes from './routes/patProfileRoutes.js';
import { initSocket } from './socket.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: err.message });
});



app.get('/', (req, res) => {
  res.send({ message: 'API running. Try /test-server or /api/doctor' });
});

// Test Route
app.get('/test', (req, res) => {
  res.json({ success: true, message: "Test route working" });
});

// Doctor Routes
app.use('/api/v1/doctor', docRoutes);

// Patient Routes
app.use('/api/v1/patient', patientRoutes);

// Profile Routes
app.use('/api/v1/doctor/profile', doctorProfileRoutes);

// Doctor Verification Routes
app.use('/api/v1/doctor/verification', doctorVerificationRoutes);

app.use('/api/v1/doctor/specialty', doctorRoutes);

// Doctor Availability Routes
app.use('/api/v1/availability', availabilityRoutes);


// Appointment Routes
app.use('/api/v1/appointment', appointmentRoutes);

// Patient Profile Routes
app.use('/api/v1/patient/profile', patientProfileRoutes);

app.use('/v1/api/call', callRoutes);
app.use('/v1/api/messages', messageRoutes);

const PORT = process.env.PORT || 3000;

dbConnect()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
    initSocket(server);
  })
  .catch(err => console.error(err));