import * as UsersModel from '../models/users.model.js';
import * as MobilityProfilesModel from '../models/mobilityProfiles.model.js';

const TRANSPORT_OPTIONS = ['bike', 'scooter', 'car', 'public_transport', 'walk'];

export async function getProfile(req, res, next) {
  try {
    const user = await UsersModel.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const profile = await MobilityProfilesModel.findByUserId(req.userId);
    res.json({ user, profile: profile || null });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { preferred_transport, home_station_id, bio } = req.body;

    if (preferred_transport && !TRANSPORT_OPTIONS.includes(preferred_transport)) {
      return res.status(400).json({
        error: `preferred_transport must be one of: ${TRANSPORT_OPTIONS.join(', ')}`,
      });
    }

    const profile = await MobilityProfilesModel.upsert(req.userId, {
      preferred_transport,
      home_station_id: home_station_id ?? null,
      bio: bio ?? null,
    });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}
