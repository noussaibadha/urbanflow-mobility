import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Vite doesn't resolve Leaflet's default marker asset paths automatically.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export const liveLocationIcon = L.divIcon({
  className: 'live-location-marker',
  html: '<span class="live-location-dot"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export const sharedMobilityIcon = L.divIcon({
  className: 'shared-mobility-marker',
  html: '<span class="shared-mobility-dot">🚲</span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export const transitStopIcon = L.divIcon({
  className: 'transit-stop-marker',
  html: '<span class="transit-stop-dot">🚌</span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

// One marker style per GTFS route_type (0=tram, 1=métro, 2=RER, 3=bus), so
// the map visually distinguishes what actually serves each station instead
// of a single generic "transit stop" pin.
const TRANSIT_TYPE_ICON_STYLE = {
  0: { emoji: '🚊', className: 'transit-stop-marker transit-stop-tram' },
  1: { emoji: '🚇', className: 'transit-stop-marker transit-stop-metro' },
  2: { emoji: '🚆', className: 'transit-stop-marker transit-stop-rer' },
  3: { emoji: '🚌', className: 'transit-stop-marker transit-stop-bus' },
}

const transitTypeIconCache = new Map()

export function transitStopIconForType(dominantType) {
  const style = TRANSIT_TYPE_ICON_STYLE[dominantType]
  if (!style) return transitStopIcon

  if (!transitTypeIconCache.has(dominantType)) {
    transitTypeIconCache.set(
      dominantType,
      L.divIcon({
        className: style.className,
        html: `<span class="transit-stop-dot">${style.emoji}</span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })
    )
  }
  return transitTypeIconCache.get(dominantType)
}
