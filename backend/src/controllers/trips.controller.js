import * as UserTripsModel from '../models/userTrips.model.js';

const MODE_OPTIONS = ['bike', 'scooter', 'car', 'public_transport', 'walk'];
const MODE_LABELS = {
  bike: 'Vélo',
  scooter: 'Trottinette',
  car: 'Voiture',
  public_transport: 'Métro',
  walk: 'Marche',
};
const CAR_CO2_KG_PER_KM = 0.192;
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export async function createTrip(req, res, next) {
  try {
    const { mode, distance_meters, duration_seconds, from_label, to_label } = req.body;

    if (!MODE_OPTIONS.includes(mode)) {
      return res.status(400).json({ error: `mode must be one of: ${MODE_OPTIONS.join(', ')}` });
    }
    if (typeof distance_meters !== 'number' || distance_meters <= 0) {
      return res.status(400).json({ error: 'distance_meters must be a positive number' });
    }
    if (typeof duration_seconds !== 'number' || duration_seconds <= 0) {
      return res.status(400).json({ error: 'duration_seconds must be a positive number' });
    }

    const trip = await UserTripsModel.create({
      userId: req.userId,
      mode,
      distanceMeters: distance_meters,
      durationSeconds: duration_seconds,
      fromLabel: from_label,
      toLabel: to_label,
    });
    res.status(201).json({ trip });
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req, res, next) {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentTrips, lastWeekTrips, last30Trips, allTrips] = await Promise.all([
      UserTripsModel.findRecentByUser(req.userId, 3),
      UserTripsModel.findSinceByUser(req.userId, sevenDaysAgo),
      UserTripsModel.findSinceByUser(req.userId, thirtyDaysAgo),
      UserTripsModel.findAllByUser(req.userId),
    ]);

    const weeklyChart = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sevenDaysAgo);
      day.setDate(day.getDate() + i);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = lastWeekTrips.filter((t) => {
        const createdAt = new Date(t.created_at);
        return createdAt >= day && createdAt < nextDay;
      }).length;
      weeklyChart.push({ day: DAY_LETTERS[day.getDay()], count });
    }

    const co2SavedKg = allTrips
      .filter((t) => t.mode !== 'car')
      .reduce((sum, t) => sum + (t.distance_meters / 1000) * CAR_CO2_KG_PER_KM, 0);

    const ecoScore =
      last30Trips.length === 0
        ? 0
        : Math.round((last30Trips.filter((t) => t.mode !== 'car').length / last30Trips.length) * 100);

    const totalDistanceMeters = allTrips.reduce((sum, t) => sum + t.distance_meters, 0);

    const modeBreakdown = MODE_OPTIONS.map((mode) => ({
      mode,
      modeLabel: MODE_LABELS[mode],
      count: allTrips.filter((t) => t.mode === mode).length,
    })).filter((m) => m.count > 0);

    res.json({
      totalTrips: allTrips.length,
      totalDistanceMeters,
      weeklyChart,
      recentTrips: recentTrips.map((t) => ({
        id: t.id,
        mode: t.mode,
        modeLabel: MODE_LABELS[t.mode] ?? t.mode,
        distanceMeters: t.distance_meters,
        createdAt: t.created_at,
      })),
      modeBreakdown,
      co2SavedKg: Math.round(co2SavedKg * 10) / 10,
      ecoScore,
    });
  } catch (err) {
    next(err);
  }
}
