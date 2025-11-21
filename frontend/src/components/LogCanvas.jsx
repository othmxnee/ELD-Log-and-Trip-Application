// src/components/LogCanvas.jsx
import React, { useRef, useEffect } from 'react'

// (kept for future use if you want colored overlays)
const STATUS_COLORS = {
  driving: '#DC143C',    // Crimson red
  off: '#228B22',        // Forest green
  sleeper: '#4169E1',    // Royal blue
  onDuty: '#FF8C00',     // Dark orange
  on: '#FF8C00'          // Alias
}

const STATUS_LABELS = {
  off: 'OFF DUTY',
  sleeper: 'SLEEPER BERTH',
  driving: 'DRIVING',
  onDuty: 'ON DUTY (NOT DRIVING)',
  on: 'ON DUTY (NOT DRIVING)'
}

export default function LogCanvas({ page, trip }) {
  const canvasRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !page || !page.segments) return

    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.src = '/drivers_daily_log.png'

    img.onload = () => {
      const templateWidth = img.naturalWidth || 1400
      const templateHeight = img.naturalHeight || 1100
      canvas.width = templateWidth
      canvas.height = templateHeight
      drawLog(ctx, canvas.width, canvas.height, img)
    }

    img.onerror = () => {
      canvas.width = 1400
      canvas.height = 1100
      drawLog(ctx, canvas.width, canvas.height, null)
    }
  }, [page, trip])

  const drawLog = (ctx, width, height, bgImage) => {
    ctx.clearRect(0, 0, width, height)

    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, width, height)
      drawHeaderData(ctx, width)
      drawStatusLines(ctx, width, height)
    } else {
      drawFallbackTemplate(ctx, width, height)
      drawHeaderData(ctx, width)
      drawStatusLines(ctx, width, height)
    }
  }

  const drawHeaderData = (ctx, width) => {
    ctx.fillStyle = '#000'
    ctx.font = '11px Arial, sans-serif'
    ctx.textAlign = 'left'

    // tweak these numbers to align perfectly with your PNG template
    ctx.fillText(trip?.driver_name || 'Sample Driver', 65, 145)    // Driver name
    ctx.fillText(page.date || '', 600, 145)                         // Date
    ctx.fillText(trip?.carrier || 'ABC Transport Co.', 65, 185)     // Carrier

    // FROM / TO
    if (page.segments && page.segments.length > 0) {
      ctx.fillText(trip?.origin || '', 340, 240)
      ctx.fillText(trip?.destination || '', 500, 240)
    }

    // Total miles
    if (trip?.total_miles != null) {
      ctx.fillText(String(trip.total_miles), 760, 240)
    }
  }

  const drawFallbackTemplate = (ctx, width, height) => {
    // simple backup template in case PNG fails
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)

    // header
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, width, 120)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, width, 120)

    ctx.fillStyle = '#000'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('Driver Name:', 20, 40)
    ctx.fillText('Date:', 300, 40)
    ctx.fillText('Carrier:', 620, 40)
    ctx.fillText('FROM:', 20, 75)
    ctx.fillText('TO:', 260, 75)
    ctx.fillText('Total Miles Today:', 460, 75)

    // grid layout
    const leftMargin = 135
    const rightMargin = 40
    const topMargin = 315
    const bottomMargin = 245
    const gridWidth = width - leftMargin - rightMargin
    const gridHeight = height - topMargin - bottomMargin
    const laneHeight = gridHeight / 4

    // lane backgrounds
    ctx.fillStyle = '#fff'
    ctx.fillRect(leftMargin, topMargin, gridWidth, laneHeight)
    ctx.fillStyle = '#e6f2ff'
    ctx.fillRect(leftMargin, topMargin + laneHeight, gridWidth, laneHeight)
    ctx.fillStyle = '#fff9e6'
    ctx.fillRect(leftMargin, topMargin + laneHeight * 2, gridWidth, laneHeight)
    ctx.fillStyle = '#fff'
    ctx.fillRect(leftMargin, topMargin + laneHeight * 3, gridWidth, laneHeight)

    // 15-minute grid lines
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 96; i++) {
      const x = leftMargin + (i / 96) * gridWidth
      ctx.beginPath()
      ctx.moveTo(x, topMargin)
      ctx.lineTo(x, topMargin + gridHeight)
      ctx.stroke()
    }

    // hour markers
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1
    for (let i = 0; i <= 24; i++) {
      const x = leftMargin + (i / 24) * gridWidth
      ctx.beginPath()
      ctx.moveTo(x, topMargin)
      ctx.lineTo(x, topMargin + gridHeight)
      ctx.stroke()

      ctx.fillStyle = '#333'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      const label = i === 0 || i === 24 ? 'Mid' : String(i)
      ctx.fillText(label, x, topMargin - 8)
    }

    // horizontal lane lines
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1.5
    for (let i = 0; i <= 4; i++) {
      const y = topMargin + i * laneHeight
      ctx.beginPath()
      ctx.moveTo(leftMargin, y)
      ctx.lineTo(leftMargin + gridWidth, y)
      ctx.stroke()
    }

    // lane labels
    ctx.textAlign = 'right'
    ctx.font = 'bold 12px Arial'
    ctx.fillStyle = '#000'
    ctx.fillText('OFF DUTY', leftMargin - 10, topMargin + laneHeight * 0.5 + 5)
    ctx.fillText('SLEEPER BERTH', leftMargin - 10, topMargin + laneHeight * 1.5 + 5)
    ctx.fillText('DRIVING', leftMargin - 10, topMargin + laneHeight * 2.5 + 5)
    ctx.fillText('ON DUTY', leftMargin - 10, topMargin + laneHeight * 3.5 + 5)

    // totals header
    ctx.textAlign = 'center'
    ctx.font = '10px Arial'
    ctx.fillText('Total', width - 40, topMargin - 8)
    ctx.fillText('Hours', width - 40, topMargin)

    // outer border
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.strokeRect(leftMargin, topMargin, gridWidth, gridHeight)

    // remarks section
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, height - 90, width, 90)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.strokeRect(0, height - 90, width, 90)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('Remarks/Location:', 20, height - 75)
  }

  const drawStatusLines = (ctx, width, height) => {
    // layout matching the template
    const leftMargin = 135
    const rightMargin = 40
    const topMargin = 315
    const bottomMargin = 245
    const usableWidth = width - leftMargin - rightMargin
    const gridHeight = height - topMargin - bottomMargin
    const laneHeight = gridHeight / 4

    const statusToLane = {
      off: 0,
      sleeper: 1,
      driving: 2,
      onDuty: 3,
      on: 3
    }

    const statusToY = (status) => {
      const lane = statusToLane[status] ?? 0
      return topMargin + laneHeight * (lane + 0.5)
    }

    const timeToXDate = (d) => {
      const hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
      const frac = hours / 24
      return leftMargin + frac * usableWidth
    }

    if (!page.segments || page.segments.length === 0) {
      // flat OFF line
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.beginPath()
      const y = statusToY('off')
      ctx.moveTo(leftMargin, y)
      ctx.lineTo(leftMargin + usableWidth, y)
      ctx.stroke()
      return
    }

    // ---- 1) sort original segments ----
    const sorted = [...page.segments].sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    )

    // ---- 2) normalize to full 24h day (00:00–24:00) ----
    const dayStart = new Date(`${page.date}T00:00:00`)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const normalized = []
    let cursor = new Date(dayStart)
    let currentStatus = 'off' // default before first segment

    for (const seg of sorted) {
      let s = new Date(seg.start)
      let e = new Date(seg.end)

      // skip if completely outside
      if (e <= dayStart || s >= dayEnd) continue

      // clamp to [dayStart, dayEnd]
      if (s < dayStart) s = new Date(dayStart)
      if (e > dayEnd) e = new Date(dayEnd)

      // gap before this segment? fill with previous status
      if (s > cursor) {
        normalized.push({
          start: new Date(cursor),
          end: new Date(s),
          status: currentStatus
        })
      }

      normalized.push({
        start: new Date(s),
        end: new Date(e),
        status: seg.status
      })

      cursor = new Date(e)
      currentStatus = seg.status
    }

    // after last segment, extend to end of day
    if (cursor < dayEnd) {
      normalized.push({
        start: new Date(cursor),
        end: new Date(dayEnd),
        status: currentStatus
      })
    }

    if (normalized.length === 0) {
      const y = statusToY('off')
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(leftMargin, y)
      ctx.lineTo(leftMargin + usableWidth, y)
      ctx.stroke()
      return
    }

    // ---- 3) compute total hours (original segments) ----
    const totals = { off: 0, sleeper: 0, driving: 0, onDuty: 0 }
    sorted.forEach((seg) => {
      const start = new Date(seg.start)
      const end = new Date(seg.end)
      const hours = (end - start) / (1000 * 60 * 60)
      const key = seg.status === 'on' ? 'onDuty' : seg.status
      if (totals[key] != null) totals[key] += hours
    })

    ctx.fillStyle = '#000'
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'center'
    const rightX = width - 40
    ctx.fillText(totals.off.toFixed(1), rightX, topMargin + laneHeight * 0.5 + 5)
    ctx.fillText(totals.sleeper.toFixed(1), rightX, topMargin + laneHeight * 1.5 + 5)
    ctx.fillText(totals.driving.toFixed(1), rightX, topMargin + laneHeight * 2.5 + 5)
    ctx.fillText(totals.onDuty.toFixed(1), rightX, topMargin + laneHeight * 3.5 + 5)

    // ---- 4) draw one continuous step line ----
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 3
    ctx.beginPath()

    let currentSeg = normalized[0]
    let currentX = timeToXDate(currentSeg.start)
    let currentY = statusToY(currentSeg.status)
    let currentStatusDraw = currentSeg.status

    // ensure we start at midnight on the left edge
    const midnightX = timeToXDate(dayStart)
    currentX = midnightX
    currentY = statusToY(currentSeg.status)
    ctx.moveTo(currentX, currentY)

    for (let i = 0; i < normalized.length; i++) {
      const seg = normalized[i]
      const segStartX = timeToXDate(seg.start)
      const segEndX = timeToXDate(seg.end)
      const segY = statusToY(seg.status)

      // never go left: clamp start/end ≥ currentX
      let startX = segStartX
      if (startX < currentX) startX = currentX

      if (startX > currentX) {
        // horizontal gap to new time
        ctx.lineTo(startX, currentY)
        currentX = startX
      }

      // status change → vertical step at currentX
      if (seg.status !== currentStatusDraw) {
        ctx.lineTo(currentX, segY)
        currentY = segY
        currentStatusDraw = seg.status
      }

      let endX = segEndX
      if (endX < currentX) endX = currentX // safety
      ctx.lineTo(endX, currentY)
      currentX = endX
    }

    // force end of line at 24:00
    const endOfDayX = timeToXDate(dayEnd)
    if (currentX < endOfDayX) {
      ctx.lineTo(endOfDayX, currentY)
    }

    ctx.stroke()

    // ---- 5) draw violation markers (using original segments) ----
    sorted.forEach((seg) => {
      if (!seg.violation) return
      const s = new Date(seg.start)
      const e = new Date(seg.end)
      const x1 = timeToXDate(s)
      const x2 = timeToXDate(e)
      const y = statusToY(seg.status)

      ctx.fillStyle = '#FF0000'
      ctx.font = 'bold 18px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('⚠', (x1 + x2) / 2, y - 25)
      ctx.font = '9px Arial'
      ctx.fillText('VIOLATION', (x1 + x2) / 2, y - 12)
    })
  }

  const downloadPNG = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `eld-log-${page.date}.png`
    a.click()
  }

  const exportPDF = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const imgData = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>ELD Log - ${page.date}</title>
          <style>
            body { margin: 0; padding: 20px; }
            img { max-width: 100%; height: auto; }
            @media print {
              body { padding: 0; }
              img { max-width: 100%; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <img src="${imgData}" onload="window.print()" />
          <script>
            window.onafterprint = function() { window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <canvas
        ref={canvasRef}
        className="eld-canvas"
        style={{
          maxWidth: '100%',
          height: 'auto',
          border: '2px solid #333',
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backgroundColor: '#fff'
        }}
      />
      <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
        <button
          onClick={downloadPNG}
          style={{
            fontSize: '14px',
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          📥 Download PNG
        </button>
        <button
          onClick={exportPDF}
          style={{
            fontSize: '14px',
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          📄 Export PDF
        </button>
      </div>
    </div>
  )
}
