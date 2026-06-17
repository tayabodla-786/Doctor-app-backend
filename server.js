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
import docMessageRoutes from './routes/docMessageRoutes.js';
import patMessageRoutes from './routes/patMessageRoutes.js';
import docCallRoutes from './routes/docCallRoutes.js';
import patCallRoutes from './routes/patCallRoutes.js';
import patientProfileRoutes from './routes/patProfileRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { initSocket } from './socket.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.send({ message: 'API running. Try /test or /api/v1/auth/me' });
});

app.get('/test', (req, res) => {
  res.json({ success: true, message: "Test route working" });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/doctor', docRoutes);
app.use('/api/v1/patient', patientRoutes);
app.use('/api/v1/doctor/profile', doctorProfileRoutes);
app.use('/api/v1/doctor/verification', doctorVerificationRoutes);
app.use('/api/v1/doctor/specialty', doctorRoutes);
app.use('/api/v1/availability', availabilityRoutes);
app.use('/api/v1/appointment', appointmentRoutes);
app.use('/api/v1/patient/profile', patientProfileRoutes);
app.use('/api/v1/call', callRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/doctor/messages', docMessageRoutes);
app.use('/api/v1/patient/messages', patMessageRoutes);
app.use('/api/v1/doctor/call', docCallRoutes);
app.use('/api/v1/patient/call', patCallRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3000;

dbConnect()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    initSocket(server);
  })
  .catch(err => console.error(err));
