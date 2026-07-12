import { Router } from 'express';
import {
  getStations,
  getStation,
  createStation,
  deleteStation,
} from '../controllers/stations.controller.js';

const router = Router();

router.get('/', getStations);
router.get('/:id', getStation);
router.post('/', createStation);
router.delete('/:id', deleteStation);

export default router;
