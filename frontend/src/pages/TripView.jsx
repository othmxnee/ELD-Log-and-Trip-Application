import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import MapView from '../components/MapView'
import LogCanvas from '../components/LogCanvas'
import api from '../api'

export default function TripView() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [route, setRoute] = useState(null)
  const [pages, setPages] = useState(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setError(null)
    api.getTrip(id).then(setTrip).catch(e => setError(e.message))
  }, [id])

  // Automatically load route when trip is loaded
  useEffect(() => {
    if (trip && !route && !loadingRoute) {
      getRoute()
    }
  }, [trip])

  const getRoute = async () => {
    setLoadingRoute(true); setError(null)
    try {
      const r = await api.getRoute(id)
      setRoute(r)
    } catch (err) { setError('Failed to get route: ' + (err.message || err)) }
    setLoadingRoute(false)
  }

  const computeLogs = async () => {
    setLoadingLogs(true); setError(null)
    try {
      const res = await api.computeLogs(id)
      setPages(res.pages)
    } catch (err) { setError('Failed to compute logs: ' + (err.message || err)) }
    setLoadingLogs(false)
  }

  const exportPDF = async () => {
    setError(null)
    try {
      // Select only ELD canvases and wait a bit for drawing to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      const canvases = Array.from(document.querySelectorAll('canvas.eld-canvas'))
      if (canvases.length === 0) {
        setError('No ELD canvases found to export')
        return
      }
      const pagesPayload = canvases.map(c => ({ image_b64: c.toDataURL('image/png') }))
      const blob = await api.renderPdf(id, pagesPayload)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trip_${id}_logs.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) { setError('Failed to export PDF: ' + (err.message || err)) }
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Trip {id}</h2>
          <div className="controls">
            <button onClick={getRoute} disabled={loadingRoute}>{loadingRoute ? 'Loading route...' : 'Get Route'}</button>
            <button onClick={computeLogs} disabled={loadingLogs}>{loadingLogs ? 'Computing...' : 'Compute Logs'}</button>
            {pages && <button onClick={exportPDF}>Export PDF</button>}
          </div>
        </div>
        {error && <div className="error">{error}</div>}

        {trip && (
          <div style={{ marginTop: 12 }}>
            <h3>Trip details</h3>
            <div className="row"><label>Start</label><div className="row-vertical"><div>{trip.start_address}</div><div className="muted">{trip.start_coords?.join(', ')}</div></div></div>
            <div className="row"><label>Pickup</label><div className="row-vertical"><div>{trip.pickup_address}</div><div className="muted">{trip.pickup_coords?.join(', ')}</div></div></div>
            <div className="row"><label>Dropoff</label><div className="row-vertical"><div>{trip.dropoff_address}</div><div className="muted">{trip.dropoff_coords?.join(', ')}</div></div></div>
          </div>
        )}

        <div className="map-wrap">
          <MapView route={route} trip={trip} />
        </div>

        {pages && pages.map(p => <div key={p.date} style={{ marginTop: 12 }}><h4>{p.date}</h4><LogCanvas page={p} trip={trip} /></div>)}
      </div>
    </div>
  )
}
