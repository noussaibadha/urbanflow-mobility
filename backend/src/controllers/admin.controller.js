import * as UsersModel from '../models/users.model.js';
import * as UserTripsModel from '../models/userTrips.model.js';

const ROLE_OPTIONS = ['user', 'admin'];
const CAR_CO2_KG_PER_KM = 0.192;

export async function listUsers(req, res, next) {
  try {
    const users = await UsersModel.findAll();
    res.json({ users, total: users.length });
  } catch (err) {
    next(err);
  }
}

export async function changeUserRole(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const { role } = req.body;
    if (!ROLE_OPTIONS.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLE_OPTIONS.join(', ')}` });
    }

    const user = await UsersModel.updateRole(req.params.id, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function suspendUser(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'You cannot suspend your own account' });
    }

    const { is_suspended } = req.body;
    if (typeof is_suspended !== 'boolean') {
      return res.status(400).json({ error: 'is_suspended must be a boolean' });
    }

    const user = await UsersModel.updateSuspended(req.params.id, is_suspended);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUserAccount(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const deleted = await UsersModel.deleteUser(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getUserStats(req, res, next) {
  try {
    const user = await UsersModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stats = await UserTripsModel.getStatsByUserId(req.params.id);
    const co2SavedKg = (stats.eco_distance_meters / 1000) * CAR_CO2_KG_PER_KM;

    res.json({
      totalTrips: stats.total_trips,
      totalDistanceMeters: stats.total_distance_meters,
      co2SavedKg: Math.round(co2SavedKg * 10) / 10,
    });
  } catch (err) {
    next(err);
  }
}
