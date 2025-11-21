import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import NewTrip from './pages/NewTrip'
import TripView from './pages/TripView'
import TripsList from './pages/TripsList'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 20 }}>
        <h2>HOS ELD MVP</h2>
        <nav><Link to="/">New Trip</Link> | <Link to="/trips">All Trips</Link></nav>
        <Routes>
          <Route path="/" element={<NewTrip />} />
          <Route path="/trips" element={<TripsList />} />
          <Route path="/trip/:id" element={<TripView />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
