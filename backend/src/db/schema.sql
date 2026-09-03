CREATE TABLE IF NOT EXISTS stations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  type VARCHAR(30) NOT NULL CHECK (type IN ('bike', 'scooter', 'car')),
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_station_id INTEGER REFERENCES stations(id),
  end_station_id INTEGER REFERENCES stations(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

UPDATE users SET role = 'admin' WHERE email = 'admin@urbanflow.fr';

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS mobility_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_transport VARCHAR(30) NOT NULL DEFAULT 'bike' CHECK (preferred_transport IN ('bike', 'scooter', 'car', 'public_transport', 'walk')),
  home_station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
  bio VARCHAR(500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transit_stops (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  source_feed VARCHAR(255) NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mobility_profiles ADD COLUMN IF NOT EXISTS eco_priority BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE mobility_profiles ADD COLUMN IF NOT EXISTS avoid_highways BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE mobility_profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true;

-- Replaces the old eco_priority boolean toggle: which of the planner's
-- already-computed mode comparisons to highlight as "Recommandé" (see
-- RoutePlanner.jsx). eco_priority itself is left in place, unused, rather
-- than dropped — this schema only ever adds columns, never drops them.
ALTER TABLE mobility_profiles ADD COLUMN IF NOT EXISTS route_priority VARCHAR(20) NOT NULL DEFAULT 'fast' CHECK (route_priority IN ('fast', 'eco', 'cheap'));

CREATE TABLE IF NOT EXISTS user_trips (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(30) NOT NULL CHECK (mode IN ('bike', 'scooter', 'car', 'public_transport', 'walk')),
  distance_meters DOUBLE PRECISION NOT NULL,
  duration_seconds DOUBLE PRECISION NOT NULL,
  from_label VARCHAR(255),
  to_label VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorite_places (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  address VARCHAR(300) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- home_station_id used to reference the "stations" table (bike/scooter dock
-- stations), which is never seeded in this project — so the "station de
-- rattachement" selector always had zero options. Real station data lives in
-- transit_stops (imported from GTFS), so point the FK there instead.
ALTER TABLE mobility_profiles DROP CONSTRAINT IF EXISTS mobility_profiles_home_station_id_fkey;
ALTER TABLE mobility_profiles ALTER COLUMN home_station_id TYPE VARCHAR(64) USING home_station_id::VARCHAR(64);
ALTER TABLE mobility_profiles
  ADD CONSTRAINT mobility_profiles_home_station_id_fkey
  FOREIGN KEY (home_station_id) REFERENCES transit_stops(id) ON DELETE SET NULL;

-- Which tram/métro/RER lines serve each transit_stops station, derived from
-- GTFS routes.txt + trips.txt + stop_times.txt at import time. Used to show
-- a real "which line, which stations, which transfer" métro journey.
CREATE TABLE IF NOT EXISTS transit_stop_routes (
  stop_id VARCHAR(64) NOT NULL REFERENCES transit_stops(id) ON DELETE CASCADE,
  route_id VARCHAR(64) NOT NULL,
  route_short_name VARCHAR(50),
  route_color VARCHAR(10),
  route_type INTEGER,
  PRIMARY KEY (stop_id, route_id)
);

-- One row per (route, direction), so we can tell a rider which terminus to
-- board towards — e.g. "ligne 1 direction La Défense" — instead of just
-- naming the line. station_sequence is the ordered list of transit_stops.id
-- (comma-separated) visited by a representative trip in that direction,
-- derived from GTFS stop_times.txt stop_sequence at import time.
CREATE TABLE IF NOT EXISTS transit_route_directions (
  route_id VARCHAR(64) NOT NULL,
  direction_id VARCHAR(4) NOT NULL,
  headsign VARCHAR(200),
  route_short_name VARCHAR(50),
  route_color VARCHAR(10),
  station_sequence TEXT NOT NULL,
  PRIMARY KEY (route_id, direction_id)
);
