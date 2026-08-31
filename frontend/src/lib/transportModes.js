export const PREFERRED_TRANSPORT_OPTIONS = [
  { value: 'bike', label: 'Vélo', color: '#52B788' },
  { value: 'scooter', label: 'Trottinette', color: '#D9A441' },
  { value: 'public_transport', label: 'Métro', color: '#1A3A2A' },
  { value: 'car', label: 'Voiture', color: '#7FA98C' },
]

export const PLANNER_MODE_OPTIONS = [
  { value: 'walk', label: 'À pied', color: '#6B8F87' },
  { value: 'bike', label: 'Vélo', color: '#52B788' },
  { value: 'scooter', label: 'Trottinette', color: '#D9A441' },
  { value: 'public_transport', label: 'Métro', color: '#1A3A2A' },
  { value: 'car', label: 'Voiture', color: '#7FA98C' },
]

export const TRANSPORT_MODE_META = {
  bike: { label: 'Vélo', color: '#52B788', emoji: '🚲' },
  scooter: { label: 'Trottinette', color: '#D9A441', emoji: '🛴' },
  public_transport: { label: 'Métro', color: '#1A3A2A', emoji: '🚇' },
  car: { label: 'Voiture', color: '#7FA98C', emoji: '🚗' },
  walk: { label: 'À pied', color: '#6B8F87', emoji: '🚶' },
}

// GTFS route_type: 0=tram, 1=metro, 2=rail (RER/train), 3=bus.
export const ROUTE_TYPE_META = {
  0: { label: 'Tram', emoji: '🚊', color: '#7FA98C' },
  1: { label: 'Métro', emoji: '🚇', color: '#1A3A2A' },
  2: { label: 'RER', emoji: '🚆', color: '#D9A441' },
  3: { label: 'Bus', emoji: '🚌', color: '#52B788' },
}
