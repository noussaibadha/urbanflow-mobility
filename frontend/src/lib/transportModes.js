export const PREFERRED_TRANSPORT_OPTIONS = [
  { value: 'walk', label: 'À pied', color: '#6B8F87' },
  { value: 'bike', label: 'Vélo', color: '#52B788' },
  { value: 'public_transport', label: 'TC', color: '#3B6E91' },
  { value: 'car', label: 'Voiture', color: '#7FA98C' },
]

// Which of the planner's already-computed mode comparisons to highlight as
// "Recommandé" — see pickRecommendedMode in RoutePlanner.jsx.
export const ROUTE_PRIORITY_OPTIONS = [
  { value: 'fast', label: 'Rapide', color: '#3B6E91' },
  { value: 'eco', label: 'Écologique', color: '#52B788' },
  { value: 'cheap', label: 'Économique', color: '#D9A441' },
]

// "Trottinette" here is a theoretical route estimate only (like "À pied") —
// no real free-floating availability check. Free-floating scooters have been
// banned in Paris since September 2023; the one real GBFS integration this
// app has (Dott) only lists bikes and is folded into "Vélo" instead (see
// backend/src/services/dottBikes.service.js).
export const PLANNER_MODE_OPTIONS = [
  { value: 'walk', label: 'À pied', color: '#6B8F87' },
  { value: 'bike', label: 'Vélo', color: '#52B788' },
  { value: 'scooter', label: 'Trottinette', color: '#D9A441' },
  { value: 'public_transport', label: 'TC', color: '#3B6E91' },
  { value: 'car', label: 'Voiture', color: '#7FA98C' },
]

export const TRANSPORT_MODE_META = {
  bike: { label: 'Vélo', color: '#52B788', emoji: '🚲' },
  scooter: { label: 'Trottinette', color: '#D9A441', emoji: '🛴' },
  public_transport: { label: 'TC', color: '#3B6E91', emoji: '🚏' },
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
