import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function NewTrip() {
  const nav = useNavigate()
  const [form, setForm] = useState({
    start_address: '', pickup_address: '', dropoff_address: '',
    start_lat: '', start_lng: '', pickup_lat: '', pickup_lng: '', dropoff_lat: '', dropoff_lng: '',
    current_cycle_hours: 0, start_datetime: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    setError(null)

    // Validate: at least coordinates for start and dropoff
    const hasStart = form.start_lat !== '' && form.start_lng !== ''
    const hasDrop = form.dropoff_lat !== '' && form.dropoff_lng !== ''

    if (!hasStart || !hasDrop) {
      setError('Please provide at least start and dropoff coordinates')
      return
    }

    const payload = {
      start_address: form.start_address,
      pickup_address: form.pickup_address,
      dropoff_address: form.dropoff_address,
      start_coords: [parseFloat(form.start_lat), parseFloat(form.start_lng)],
      pickup_coords: form.pickup_lat !== '' && form.pickup_lng !== ''
        ? [parseFloat(form.pickup_lat), parseFloat(form.pickup_lng)]
        : null,
      dropoff_coords: [parseFloat(form.dropoff_lat), parseFloat(form.dropoff_lng)],
      current_cycle_hours: parseFloat(form.current_cycle_hours) || 0,
      start_datetime: form.start_datetime || undefined,
    }

    try {
      setLoading(true)
      const data = await api.createTrip(payload)
      nav(`/trip/${data.id}`)
    } catch (err) {
      setError(err.message || 'Failed to create trip')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '500',
    color: '#333',
    fontSize: '14px'
  }

  const sectionStyle = {
    marginBottom: '28px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef'
  }

  const sectionTitleStyle = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#495057',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid #dee2e6'
  }

  const helperTextStyle = {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '4px',
    fontStyle: 'italic'
  }

  const rowStyle = {
    marginBottom: '16px'
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '24px', color: '#212529', fontSize: '28px' }}>Create New Trip</h2>

        <form onSubmit={submit}>
          {/* Locations Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>📍 Locations</div>
            <div style={rowStyle}>
              <label style={labelStyle}>Start Address</label>
              <input
                style={inputStyle}
                value={form.start_address}
                onChange={e => update('start_address', e.target.value)}
                placeholder="e.g., Algiers, Algeria"
              />
              <div style={helperTextStyle}>Optional - Used for display purposes</div>
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Pickup Address</label>
              <input
                style={inputStyle}
                value={form.pickup_address}
                onChange={e => update('pickup_address', e.target.value)}
                placeholder="e.g., Constantine, Algeria"
              />
              <div style={helperTextStyle}>Optional - Intermediate stop</div>
            </div>
            <div style={rowStyle}>
              <label style={labelStyle}>Dropoff Address</label>
              <input
                style={inputStyle}
                value={form.dropoff_address}
                onChange={e => update('dropoff_address', e.target.value)}
                placeholder="e.g., Oran, Algeria"
              />
              <div style={helperTextStyle}>Optional - Final destination</div>
            </div>
          </div>

          {/* Coordinates Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>🗺️ Coordinates</div>
            <div style={{ ...helperTextStyle, marginBottom: '16px', color: '#495057' }}>
              <strong>Required:</strong> Coordinates are needed for accurate routing. Example: 36.7538, 3.0588 (Algiers)
            </div>

            <div style={rowStyle}>
              <div style={{ fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Start Location</div>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Latitude *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={form.start_lat}
                    onChange={e => update('start_lat', e.target.value)}
                    placeholder="36.7538"
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Longitude *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={form.start_lng}
                    onChange={e => update('start_lng', e.target.value)}
                    placeholder="3.0588"
                    required
                  />
                </div>
              </div>
            </div>

            <div style={rowStyle}>
              <div style={{ fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Pickup Location</div>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Latitude</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={form.pickup_lat}
                    onChange={e => update('pickup_lat', e.target.value)}
                    placeholder="36.3650"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Longitude</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={form.pickup_lng}
                    onChange={e => update('pickup_lng', e.target.value)}
                    placeholder="6.6147"
                  />
                </div>
              </div>
            </div>

            <div style={rowStyle}>
              <div style={{ fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Dropoff Location</div>
              <div style={gridStyle}>
                <div>
                  <label style={labelStyle}>Latitude *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={form.dropoff_lat}
                    onChange={e => update('dropoff_lat', e.target.value)}
                    placeholder="35.6969"
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Longitude *</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={form.dropoff_lng}
                    onChange={e => update('dropoff_lng', e.target.value)}
                    placeholder="-0.6331"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* HOS Context Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>⏱️ HOS Context</div>
            <div style={gridStyle}>
              <div>
                <label style={labelStyle}>Current Cycle Hours</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  max="70"
                  step="0.1"
                  value={form.current_cycle_hours}
                  onChange={e => update('current_cycle_hours', e.target.value)}
                />
                <div style={helperTextStyle}>Hours used in current 8-day cycle (0-70)</div>
              </div>
              <div>
                <label style={labelStyle}>Start Date & Time</label>
                <input
                  style={inputStyle}
                  type="datetime-local"
                  value={form.start_datetime}
                  onChange={e => update('start_datetime', e.target.value)}
                />
                <div style={helperTextStyle}>When the trip begins</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px 24px',
                background: loading ? '#6c757d' : '#0ea5a4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => !loading && (e.target.style.background = '#0c8786')}
              onMouseOut={e => !loading && (e.target.style.background = '#0ea5a4')}
            >
              {loading ? '⏳ Creating Trip...' : '✓ Create Trip'}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({
                  start_address: '', pickup_address: '', dropoff_address: '',
                  start_lat: '', start_lng: '', pickup_lat: '', pickup_lng: '', dropoff_lat: '', dropoff_lng: '',
                  current_cycle_hours: 0, start_datetime: ''
                })
                setError(null)
              }}
              style={{
                padding: '14px 24px',
                background: 'white',
                color: '#495057',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.target.style.borderColor = '#adb5bd'}
              onMouseOut={e => e.target.style.borderColor = '#dee2e6'}
            >
              🔄 Reset
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              ⚠️ {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
