import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import stationsRoutes from './routes/stations.routes.js';
import vehiclesRoutes from './routes/vehicles.routes.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'UrbanFlow Mobility API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/vehicles', vehiclesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`UrbanFlow Mobility API running on http://localhost:${PORT}`);
});
