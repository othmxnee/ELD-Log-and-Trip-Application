const API = 'https://eld-log-and-trip-application.onrender.com'

export const getTrip = (id) => fetch(`${API}/api/trips/${id}/`).then(r=>r.json())
export const createTrip = (payload) => fetch(`${API}/api/trips/`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }).then(r=>r.json())
export const getRoute = (id) => fetch(`${API}/api/trips/${id}/route/`).then(r=>r.json())
export const computeLogs = (id) => fetch(`${API}/api/trips/${id}/compute-logs/`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) }).then(r=>r.json())
export const renderPdf = (id, pages) => fetch(`${API}/api/trips/${id}/render-log/`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pages })}).then(r=>r.blob())

export default { getTrip, createTrip, getRoute, computeLogs, renderPdf }
