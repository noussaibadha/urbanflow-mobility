import { Router } from 'express';
import {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicleStatus,
  deleteVehicle,
} from '../controllers/vehicles.controller.js';

const router = Router();

router.get('/', getVehicles);
router.get('/:id', getVehicle);
router.post('/', createVehicle);
router.patch('/:id/status', updateVehicleStatus);
router.delete('/:id', deleteVehicle);

export default router;
