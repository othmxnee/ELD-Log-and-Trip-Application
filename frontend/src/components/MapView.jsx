// frontend/src/components/MapView.jsx
import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// --- Fix Leaflet default icon paths for many bundlers (optional but helpful) ---
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
})

// --- FitBounds component (single definition) ---
function FitBounds({ positions = [] }) {
  const map = useMap()
  useEffect(() => {
    try {
      if (positions && positions.length > 0) {
        map.fitBounds(positions, { padding: [40, 40] })
      }
    } catch (e) {
      // ignore
    }
  }, [map, positions])
  return null
}

// --- Color marker helper ---
const AVAILABLE = ['blue', 'red', 'green', 'orange', 'yellow', 'violet', 'grey', 'black']
const icon = (color = 'blue') => {
  const c = AVAILABLE.includes(color) ? color : 'blue'
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${c}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
  })
}

// --- utilities ---
function ensureLatLng(a) {
  if (!a) return null
  // accept [lat, lng] possibly as strings
  const lat = parseFloat(a[0])
  const lng = parseFloat(a[1])
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng]
  return null
}

/**
 * Props:
 *  - route: optional GeoJSON-like { geometry: { coordinates: [ [lon,lat], ... ] } }
 *  - trip: optional trip object { start_coords: [lat,lng], pickup_coords: [...], dropoff_coords: [...] }
 *
 * The component prefers route.geometry (GeoJSON [lon,lat]) and converts to [lat,lng] for Leaflet.
 * If no route, it falls back to trip coords (assumed [lat,lng]).
 */
export default function MapView({ route, trip }) {
  // Build coords array in Leaflet [lat,lng] order
  let coords = []

  if (route && route.geometry && Array.isArray(route.geometry.coordinates)) {
    coords = route.geometry.coordinates
      .map((c) => {
        if (!Array.isArray(c) || c.length < 2) return null
        // GeoJSON uses [lon, lat] but Leaflet needs [lat, lon]
        const [lon, lat] = c
        const latN = parseFloat(lat); const lonN = parseFloat(lon)
        // Return in Leaflet order: [lat, lon]
        if (Number.isFinite(latN) && Number.isFinite(lonN)) return [latN, lonN]
        return null
      })
      .filter(Boolean)
  } else if (trip) {
    const s = ensureLatLng(trip.start_coords)
    const p = ensureLatLng(trip.pickup_coords)
    const d = ensureLatLng(trip.dropoff_coords)
    if (s) coords.push(s)
    if (p) coords.push(p)
    if (d) coords.push(d)
  }

  // Markers array
  const markers = []
  const sPos = ensureLatLng(trip?.start_coords)
  const pPos = ensureLatLng(trip?.pickup_coords)
  const dPos = ensureLatLng(trip?.dropoff_coords)
  if (sPos) markers.push({ pos: sPos, color: 'green', label: 'Start' })
  if (pPos) markers.push({ pos: pPos, color: 'orange', label: 'Pickup' })
  if (dPos) markers.push({ pos: dPos, color: 'red', label: 'Dropoff' })

  const center = coords.length ? coords[Math.floor(coords.length / 2)] : (markers.length ? markers[0].pos : [0, 0])

  // If no coords and no markers, render a placeholder box
  if ((!coords || coords.length === 0) && (!markers || markers.length === 0)) {
    return <div style={{ height: 300, border: '1px solid #e5e7eb', borderRadius: 8, margin: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>No route yet</div>
  }

  return (
    <div style={{ height: 400, margin: '10px 0' }}>
      <MapContainer center={center} zoom={6} style={{ height: '100%', borderRadius: 8 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {coords.length > 0 && <Polyline positions={coords} pathOptions={{ color: '#0ea5a4', weight: 4 }} />}
        {markers.map((m, idx) => (
          <Marker key={idx} position={m.pos} icon={icon(m.color)}>
            <Popup>{m.label}</Popup>
          </Marker>
        ))}
        <FitBounds positions={coords.length ? coords : markers.map(m => m.pos)} />
      </MapContainer>
    </div>
  )
}
