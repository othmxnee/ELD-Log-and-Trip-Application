import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// global styles
import './index.css'
// leaflet css for maps
import 'leaflet/dist/leaflet.css'

const root = createRoot(document.getElementById('root'))
root.render(<App />)
