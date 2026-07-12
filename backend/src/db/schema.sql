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

CREATE TABLE IF NOT EXISTS mobility_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_transport VARCHAR(30) NOT NULL DEFAULT 'bike' CHECK (preferred_transport IN ('bike', 'scooter', 'car', 'public_transport', 'walk')),
  home_station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
  bio VARCHAR(500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
