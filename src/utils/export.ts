// export.ts — PDF report generator
// BUG 4 FIX: map snippet now crops to bounding box of measurements

import type { Measurement, AreaMeasurement, DistanceMeasurement, Point } from '../hooks/useCanvasEngine'
import type { ScaleConfig } from './scale'
import { UNIT_LIST, sqftToAll, formatUnit } from './units'

const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jsPDFLib: any = null

async function getJsPDF() {
  if (jsPDFLib) return jsPDFLib
  await loadScript(JSPDF_CDN)
  // @ts-ignore
  jsPDFLib = window.jspdf
  return jsPDFLib
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export interface ExportOptions {
  mapCanvas: HTMLCanvasElement
  measurements: Measurement[]
  scale: ScaleConfig | null
  fileName: string
  lang: 'en' | 'bn'
}

// ── BUG 4 FIX: compute bounding box of all measurement points ────────
function getMeasurementBounds(measurements: Measurement[], imgW: number, imgH: number): {
  x: number; y: number; w: number; h: number
} {
  if (measurements.length === 0) {
    return { x: 0, y: 0, w: imgW, h: imgH }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  measurements.forEach(m => {
    const pts = m.type === 'distance' ? m.points : m.points
    ;(pts as Point[]).forEach(p => {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    })
  })

  // Add generous padding around the bounding box (15% of the measured span or min 80px)
  const spanX = maxX - minX, spanY = maxY - minY
  const padX = Math.max(spanX * 0.20, 80)
  const padY = Math.max(spanY * 0.20, 80)

  const x = Math.max(0, minX - padX)
  const y = Math.max(0, minY - padY)
  const w = Math.min(imgW - x, (maxX - minX) + padX * 2)
  const h = Math.min(imgH - y, (maxY - minY) + padY * 2)

  return { x, y, w, h }
}

export async function exportPDFReport(opts: ExportOptions): Promise<void> {
  const { mapCanvas, measurements, scale, fileName, lang } = opts
  const lib = await getJsPDF()
  const { jsPDF } = lib

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210, PH = 297, M = 14
  const isBn = lang === 'bn'

  // ── 1. Cropped map snippet ────────────────────────────────────────
  const imgW = mapCanvas.width, imgH = mapCanvas.height
  const bounds = getMeasurementBounds(measurements, imgW, imgH)
  const snippetDataUrl = renderMapSnippet(mapCanvas, measurements, bounds)

  // ── 2. Header ─────────────────────────────────────────────────────
  doc.setFillColor(26, 20, 16)
  doc.rect(0, 0, PW, 18, 'F')
  doc.setTextColor(240, 232, 216)
  doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text('JomiMap', M, 11)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 160, 130)
  doc.text('Land Measurement Report  ·  \u099C\u09AE\u09BF \u09AA\u09B0\u09BF\u09AE\u09BE\u09AA \u09B0\u09BF\u09AA\u09CB\u09B0\u09CD\u099F', M + 28, 11)
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  doc.setTextColor(160, 140, 110)
  doc.text(dateStr, PW - M, 11, { align: 'right' })

  // ── 3. Map snippet (cropped) ──────────────────────────────────────
  const snippetY = 22
  const snippetH = 90
  const snippetW = PW - M * 2

  // Maintain aspect ratio of the cropped area
  const cropAspect = bounds.w / bounds.h
  const boxAspect  = snippetW / snippetH
  let drawW = snippetW, drawH = snippetH, drawX = M, drawY = snippetY
  if (cropAspect > boxAspect) {
    drawH = snippetW / cropAspect
    drawY = snippetY + (snippetH - drawH) / 2
  } else {
    drawW = snippetH * cropAspect
    drawX = M + (snippetW - drawW) / 2
  }

  doc.setDrawColor(200, 180, 150); doc.setLineWidth(0.3)
  doc.rect(M, snippetY, snippetW, snippetH)
  doc.setFillColor(245, 240, 228)
  doc.rect(M, snippetY, snippetW, snippetH, 'F')
  doc.addImage(snippetDataUrl, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST')

  // VERIFIED stamp
  doc.saveGraphicsState()
  doc.setGState(doc.GState({ opacity: 0.14 }))
  doc.setTextColor(74, 124, 89); doc.setFontSize(30); doc.setFont('helvetica', 'bold')
  doc.text('VERIFIED', M + snippetW / 2, snippetY + snippetH / 2 + 6, { align: 'center', angle: -20 })
  doc.restoreGraphicsState()

  const stX = M + snippetW - 2, stY = snippetY + snippetH - 2
  doc.setFillColor(74, 124, 89)
  doc.roundedRect(stX - 40, stY - 9, 40, 9, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
  doc.text('\u2713 JomiMap Verified', stX - 20, stY - 3, { align: 'center' })

  // ── 4. Scale + file row ───────────────────────────────────────────
  let curY = snippetY + snippetH + 7
  doc.setFillColor(245, 240, 228)
  doc.roundedRect(M, curY, snippetW, 8, 1, 1, 'F')
  doc.setTextColor(90, 70, 40); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
  doc.text(scale ? `Scale: ${scale.label}` : 'Scale: Not calibrated', M + 3, curY + 5.2)
  doc.text(`File: ${fileName}`, PW - M - 3, curY + 5.2, { align: 'right' })
  curY += 12

  // ── 5. Measurements ───────────────────────────────────────────────
  doc.setFontSize(10); doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 20, 16)
  doc.text(isBn ? '\u09AA\u09B0\u09BF\u09AE\u09BE\u09AA\u09C7\u09B0 \u09AB\u09B2\u09BE\u09AB\u09B2' : 'Measurement Results', M, curY)
  curY += 6

  measurements.forEach((m, idx) => {
    if (curY > PH - 40) { doc.addPage(); curY = M }
    const typeLabel = m.type === 'area' ? 'Area' : 'Distance'
    doc.setFillColor(m.type === 'area' ? 74 : 192, m.type === 'area' ? 124 : 82, m.type === 'area' ? 89 : 42)
    doc.roundedRect(M, curY, snippetW, 7, 1, 1, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.text(`#${idx + 1}  ${typeLabel}`, M + 3, curY + 4.8)
    curY += 9
    if (m.type === 'area') curY = renderAreaTable(doc, m as AreaMeasurement, M, curY, snippetW, scale)
    else curY = renderDistanceTable(doc, m as DistanceMeasurement, M, curY, snippetW, scale)
    curY += 5
  })

  if (measurements.length === 0) {
    doc.setTextColor(150, 130, 100); doc.setFontSize(9); doc.setFont('helvetica', 'italic')
    doc.text('No measurements recorded.', M, curY + 6); curY += 12
  }

  // ── 6. Footer ─────────────────────────────────────────────────────
  const footerY = PH - 14
  doc.setFillColor(26, 20, 16); doc.rect(0, footerY, PW, 14, 'F')
  doc.setTextColor(160, 140, 110); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text('Made by Mehedy  \u00B7  github.com/mehedyk  \u00B7  \u09AC\u09BE\u09A8\u09BF\u09AF\u09BC\u09C7\u099B\u09C7\u09A8 \u09AE\u09C7\u09B9\u09C7\u09A6\u09C0', M, footerY + 5.5)
  doc.text('JomiMap \u00B7 jomimap.vercel.app', PW - M, footerY + 5.5, { align: 'right' })
  doc.setTextColor(100, 90, 70); doc.setFontSize(6)
  doc.text('This report is based on the map and scale provided by the user. Always verify with official land records.', M, footerY + 10)

  doc.save(`JomiMap_Report_${dateStr.replace(/ /g, '_')}.pdf`)
}

// ── Render cropped map snippet ────────────────────────────────────────
function renderMapSnippet(
  bgCanvas: HTMLCanvasElement,
  measurements: Measurement[],
  bounds: { x: number; y: number; w: number; h: number }
): string {
  const { x, y, w, h } = bounds

  const out = document.createElement('canvas')
  out.width  = w
  out.height = h
  const ctx = out.getContext('2d')!

  // Draw only the cropped region of the map
  ctx.drawImage(bgCanvas, x, y, w, h, 0, 0, w, h)

  // Draw measurements offset by crop origin
  measurements.forEach(m => {
    if (m.type === 'distance') {
      drawExportLine(ctx, shift(m.points[0], x, y), shift(m.points[1], x, y))
    } else {
      drawExportPolygon(ctx, m.points.map(p => shift(p, x, y)))
    }
  })

  return out.toDataURL('image/png')
}

function shift(p: Point, ox: number, oy: number): Point {
  return { x: p.x - ox, y: p.y - oy }
}

function drawExportLine(ctx: CanvasRenderingContext2D, a: Point, b: Point) {
  const lw = Math.max(3, ctx.canvas.width * 0.004)
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
  ctx.strokeStyle = '#e85d2a'; ctx.lineWidth = lw
  ctx.setLineDash([lw * 3, lw * 1.5]); ctx.stroke(); ctx.setLineDash([])
  ;[a, b].forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, lw * 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#e85d2a'; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = lw * 0.8; ctx.stroke()
  })
}

function drawExportPolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  if (pts.length < 3) return
  const lw = Math.max(3, ctx.canvas.width * 0.004)
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
  ctx.closePath()
  ctx.fillStyle = 'rgba(74,124,89,0.25)'; ctx.fill()
  ctx.strokeStyle = '#4a7c59'; ctx.lineWidth = lw; ctx.stroke()
  pts.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, lw * 2, 0, Math.PI * 2)
    ctx.fillStyle = '#4a7c59'; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = lw * 0.8; ctx.stroke()
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderAreaTable(doc: any, m: AreaMeasurement, x: number, y: number, w: number, scale: ScaleConfig | null): number {
  const all = scale ? sqftToAll(m.realSqFt) : null
  const colW = w / 4, rowH = 7.5
  for (let i = 0; i < UNIT_LIST.length; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    const cx = x + col * colW, cy = y + row * rowH
    const isEven = (col + row) % 2 === 0
    doc.setFillColor(isEven ? 248 : 242, isEven ? 244 : 238, isEven ? 235 : 228)
    doc.rect(cx, cy, colW, rowH, 'F')
    doc.setDrawColor(220, 200, 170); doc.setLineWidth(0.2); doc.rect(cx, cy, colW, rowH)
    doc.setTextColor(100, 80, 50); doc.setFontSize(6); doc.setFont('helvetica', 'normal')
    doc.text(UNIT_LIST[i].en, cx + 2, cy + 2.8)
    doc.setTextColor(26, 20, 16); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.text(all ? formatUnit(all[UNIT_LIST[i].key]) : '—', cx + 2, cy + 5.8)
  }
  return y + Math.ceil(UNIT_LIST.length / 4) * rowH
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderDistanceTable(doc: any, m: DistanceMeasurement, x: number, y: number, w: number, scale: ScaleConfig | null): number {
  const feet = scale ? m.realFeet : null
  const rows = [
    { label: 'Feet',   val: feet ? formatUnit(feet, 2) : '—' },
    { label: 'Meters', val: feet ? formatUnit(feet * 0.3048, 2) : '—' },
    { label: 'Miles',  val: feet ? formatUnit(feet / 5280, 4) : '—' },
    { label: 'Km',     val: feet ? formatUnit(feet * 0.3048 / 1000, 4) : '—' },
  ]
  const colW = w / 4, rowH = 7.5
  rows.forEach((r, i) => {
    const cx = x + i * colW
    const isEven = i % 2 === 0
    doc.setFillColor(isEven ? 248 : 242, isEven ? 244 : 238, isEven ? 235 : 228)
    doc.rect(cx, y, colW, rowH, 'F')
    doc.setDrawColor(220, 200, 170); doc.setLineWidth(0.2); doc.rect(cx, y, colW, rowH)
    doc.setTextColor(100, 80, 50); doc.setFontSize(6); doc.setFont('helvetica', 'normal')
    doc.text(r.label, cx + 2, y + 2.8)
    doc.setTextColor(26, 20, 16); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.text(r.val, cx + 2, y + 5.8)
  })
  return y + rowH
}
