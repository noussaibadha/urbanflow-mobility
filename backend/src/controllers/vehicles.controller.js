import * as VehiclesModel from '../models/vehicles.model.js';

export async function getVehicles(req, res, next) {
  try {
    const vehicles = await VehiclesModel.findAll();
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
}

export async function getVehicle(req, res, next) {
  try {
    const vehicle = await VehiclesModel.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
}

export async function createVehicle(req, res, next) {
  try {
    const { type, status, battery_level, station_id } = req.body;
    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }
    const vehicle = await VehiclesModel.create({ type, status, battery_level, station_id });
    res.status(201).json(vehicle);
  } catch (err) {
    next(err);
  }
}

export async function updateVehicleStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const vehicle = await VehiclesModel.updateStatus(req.params.id, status);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
}

export async function deleteVehicle(req, res, next) {
  try {
    await VehiclesModel.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
