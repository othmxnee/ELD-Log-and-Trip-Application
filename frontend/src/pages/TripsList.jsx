import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function TripsList() {
    const [trips, setTrips] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        // Fetch trips list
        fetch('http://127.0.0.1:8000/api/trips/')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then(data => {
                setTrips(Array.isArray(data) ? data : [])
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [])

    if (loading) return <div className="container"><h2>All Trips</h2><p>Loading trips...</p></div>
    if (error) return <div className="container"><h2>All Trips</h2><div className="error">Error: {error}</div></div>

    return (
        <div className="container">
            <h2>All Trips</h2>
            {trips.length === 0 ? (
                <div className="card">
                    <p>No trips yet. <Link to="/">Create your first trip!</Link></p>
                </div>
            ) : (
                <div className="card">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #ddd' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>ID</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Start</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Pickup</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Dropoff</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trips.map(trip => (
                                <tr key={trip.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>{trip.id}</td>
                                    <td style={{ padding: '12px' }}>{trip.start_address || 'N/A'}</td>
                                    <td style={{ padding: '12px' }}>{trip.pickup_address || 'N/A'}</td>
                                    <td style={{ padding: '12px' }}>{trip.dropoff_address || 'N/A'}</td>
                                    <td style={{ padding: '12px' }}>
                                        <Link to={`/trip/${trip.id}`} style={{ color: '#0ea5a4', textDecoration: 'none' }}>View →</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
