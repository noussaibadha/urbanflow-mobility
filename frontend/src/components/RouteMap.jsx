import { useEffect, useMemo } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import '../lib/leafletIcons'
import { liveLocationIcon, sharedMobilityIcon, transitStopIconForType } from '../lib/leafletIcons'
import { ROUTE_TYPE_META } from '../lib/transportModes'

const PARIS_CENTER = [48.8566, 2.3522]

function sharedStationPopup(station) {
  return (
    <div>
      <strong>{station.name}</strong>
      <br />
      {station.bikesAvailable} vélo(s) disponible(s) ({station.mechanicalAvailable} mécanique,{' '}
      {station.ebikeAvailable} électrique)
      <br />
      {station.docksAvailable} place(s) libre(s)
    </div>
  )
}

function transitStopPopup(stop) {
  const typeLabels = (stop.routeTypes || []).map((t) => ROUTE_TYPE_META[t]?.label).filter(Boolean)
  return (
    <div>
      <strong>{stop.name}</strong>
      <br />
      {typeLabels.length > 0 ? typeLabels.join(', ') : 'Arrêt de transport en commun'}
    </div>
  )
}

function FitToRoute({ path, livePosition }) {
  const map = useMap()

  useEffect(() => {
    if (path && path.length > 1) {
      map.fitBounds(path, { padding: [40, 40] })
    } else if (livePosition) {
      map.setView([livePosition.lat, livePosition.lon], 15)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return null
}

function ClusteredMarkers({ items, icon, getIcon, popupContent }) {
  const map = useMap()

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({ maxClusterRadius: 60 })

    for (const item of items) {
      const marker = L.marker([item.lat, item.lon], { icon: getIcon ? getIcon(item) : icon })
      marker.bindPopup(renderToStaticMarkup(popupContent(item)))
      clusterGroup.addLayer(marker)
    }

    map.addLayer(clusterGroup)
    return () => map.removeLayer(clusterGroup)
  }, [items, icon, getIcon, popupContent, map])

  return null
}

export function RouteMap({ livePosition, start, end, path, sharedStations = [], transitStops = [] }) {
  const center = livePosition ? [livePosition.lat, livePosition.lon] : PARIS_CENTER

  const sharedItems = useMemo(
    () => sharedStations.map((s) => ({ ...s, lat: s.lat, lon: s.lon })),
    [sharedStations]
  )
  const transitItems = useMemo(
    () => transitStops.map((s) => ({ ...s, lat: s.latitude, lon: s.longitude })),
    [transitStops]
  )

  return (
    <MapContainer center={center} zoom={13} className="route-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {livePosition && (
        <Marker position={[livePosition.lat, livePosition.lon]} icon={liveLocationIcon}>
          <Popup>Votre position actuelle</Popup>
        </Marker>
      )}

      {start && (
        <Marker position={[start.lat, start.lon]}>
          <Popup>Départ : {start.label}</Popup>
        </Marker>
      )}

      {end && (
        <Marker position={[end.lat, end.lon]}>
          <Popup>Destination : {end.label}</Popup>
        </Marker>
      )}

      {path && path.length > 1 && <Polyline positions={path} pathOptions={{ color: '#2563eb', weight: 5 }} />}

      <ClusteredMarkers items={sharedItems} icon={sharedMobilityIcon} popupContent={sharedStationPopup} />

      <ClusteredMarkers
        items={transitItems}
        getIcon={(item) => transitStopIconForType(item.dominantType)}
        popupContent={transitStopPopup}
      />

      <FitToRoute path={path} livePosition={livePosition} />
    </MapContainer>
  )
}
