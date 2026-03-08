// export.ts — PDF report generator
// Uses jsPDF (loaded from CDN) + canvas rendering
// No server needed — 100% client-side

import type { Measurement, AreaMeasurement, DistanceMeasurement, Point } from '../hooks/useCanvasEngine'
import type { ScaleConfig } from './scale'
import { UNIT_LIST, sqftToAll, formatUnit } from './units'

// jsPDF from CDN
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
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export interface ExportOptions {
  mapCanvas: HTMLCanvasElement     // bg canvas with map image
  measurements: Measurement[]
  scale: ScaleConfig | null
  fileName: string
  lang: 'en' | 'bn'
}

// ── Main export function ──────────────────────────────────────────
export async function exportPDFReport(opts: ExportOptions): Promise<void> {
  const { mapCanvas, measurements, scale, fileName, lang } = opts
  const lib = await getJsPDF()
  const { jsPDF } = lib

  // A4 portrait
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210  // page width mm
  const PH = 297  // page height mm
  const M  = 14   // margin mm

  const isBn = lang === 'bn'

  // ── 1. Generate map snippet with highlighted measurements ────────
  const snippetDataUrl = renderMapSnippet(mapCanvas, measurements)

  // ── 2. Header bar ────────────────────────────────────────────────
  doc.setFillColor(26, 20, 16)
  doc.rect(0, 0, PW, 18, 'F')

  doc.setTextColor(240, 232, 216)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('JomiMap', M, 11)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 160, 130)
  doc.text('Land Measurement Report  ·  \u099C\u09AE\u09BF \u09AA\u09B0\u09BF\u09AE\u09BE\u09AA \u09B0\u09BF\u09AA\u09CB\u09B0\u09CD\u099F', M + 28, 11)

  // Date top right
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  doc.setFontSize(8)
  doc.setTextColor(160, 140, 110)
  doc.text(dateStr, PW - M, 11, { align: 'right' })

  // ── 3. Map snippet ───────────────────────────────────────────────
  const snippetY = 22
  const snippetH = 90
  const snippetW = PW - M * 2

  doc.setDrawColor(200, 180, 150)
  doc.setLineWidth(0.3)
  doc.rect(M, snippetY, snippetW, snippetH)
  doc.addImage(snippetDataUrl, 'PNG', M, snippetY, snippetW, snippetH, undefined, 'FAST')

  // ── 4. VERIFIED stamp over map ───────────────────────────────────
  doc.saveGraphicsState()
  doc.setGState(doc.GState({ opacity: 0.18 }))
  doc.setTextColor(74, 124, 89)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  const stampX = M + snippetW / 2
  const stampY = snippetY + snippetH / 2 + 5
  doc.text('VERIFIED', stampX, stampY, { align: 'center', angle: -20 })
  doc.restoreGraphicsState()

  // Solid stamp bottom-right of snippet
  const stX = M + snippetW - 2
  const stY = snippetY + snippetH - 2
  doc.setFillColor(74, 124, 89)
  doc.roundedRect(stX - 38, stY - 9, 38, 9, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('✓ JomiMap Verified', stX - 19, stY - 3, { align: 'center' })

  // ── 5. Scale info row ────────────────────────────────────────────
  let curY = snippetY + snippetH + 7

  doc.setFillColor(245, 240, 228)
  doc.roundedRect(M, curY, snippetW, 8, 1, 1, 'F')
  doc.setTextColor(90, 70, 40)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  const scaleLabel = scale ? `Scale: ${scale.label}` : 'Scale: Not calibrated'
  doc.text(scaleLabel, M + 3, curY + 5.2)
  doc.text(`File: ${fileName}`, PW - M - 3, curY + 5.2, { align: 'right' })

  curY += 12

  // ── 6. Measurements ──────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 20, 16)
  doc.text(isBn ? '\u09AA\u09B0\u09BF\u09AE\u09BE\u09AA\u09C7\u09B0 \u09AB\u09B2\u09BE\u09AB\u09B2' : 'Measurement Results', M, curY)
  curY += 6

  measurements.forEach((m, idx) => {
    if (curY > PH - 40) { doc.addPage(); curY = M }

    // Measurement header
    const typeLabel = m.type === 'area' ? 'Area' : 'Distance'
    doc.setFillColor(m.type === 'area' ? 74 : 192, m.type === 'area' ? 124 : 82, m.type === 'area' ? 89 : 42)
    doc.roundedRect(M, curY, snippetW, 7, 1, 1, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`#${idx + 1}  ${typeLabel}`, M + 3, curY + 4.8)
    curY += 9

    if (m.type === 'area') {
      curY = renderAreaTable(doc, m as AreaMeasurement, M, curY, snippetW, scale)
    } else {
      curY = renderDistanceTable(doc, m as DistanceMeasurement, M, curY, snippetW, scale)
    }

    curY += 5
  })

  if (measurements.length === 0) {
    doc.setTextColor(150, 130, 100)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('No measurements recorded.', M, curY + 6)
    curY += 12
  }

  // ── 7. Footer ────────────────────────────────────────────────────
  const footerY = PH - 14
  doc.setFillColor(26, 20, 16)
  doc.rect(0, footerY, PW, 14, 'F')

  doc.setTextColor(160, 140, 110)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Made by Mehedy  ·  github.com/mehedyk  ·  \u09AC\u09BE\u09A8\u09BF\u09AF\u09BC\u09C7\u099B\u09C7\u09A8 \u09AE\u09C7\u09B9\u09C7\u09A6\u09C0', M, footerY + 5.5)
  doc.text('JomiMap · jomimap.vercel.app', PW - M, footerY + 5.5, { align: 'right' })

  doc.setTextColor(100, 90, 70)
  doc.setFontSize(6)
  doc.text(
    'This report is based on the map and scale provided by the user. Always verify with official land records.',
    M, footerY + 10,
  )

  // ── 8. Save ──────────────────────────────────────────────────────
  const outName = `JomiMap_Report_${dateStr.replace(/ /g, '_')}.pdf`
  doc.save(outName)
}

// ── Render map snippet canvas ─────────────────────────────────────
function renderMapSnippet(
  bgCanvas: HTMLCanvasElement,
  measurements: Measurement[]
): string {
  const out = document.createElement('canvas')
  out.width  = bgCanvas.width
  out.height = bgCanvas.height
  const ctx = out.getContext('2d')!

  // Draw map
  ctx.drawImage(bgCanvas, 0, 0)

  // Draw all measurements on top
  measurements.forEach(m => {
    if (m.type === 'distance') {
      drawExportLine(ctx, m.points[0], m.points[1])
    } else {
      drawExportPolygon(ctx, m.points)
    }
  })

  return out.toDataURL('image/png')
}

function drawExportLine(ctx: CanvasRenderingContext2D, a: Point, b: Point) {
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.strokeStyle = '#e85d2a'
  ctx.lineWidth = 4
  ctx.setLineDash([16, 8])
  ctx.stroke()
  ctx.setLineDash([])
  ;[a, b].forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2)
    ctx.fillStyle = '#e85d2a'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()
  })
}

function drawExportPolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  if (pts.length < 3) return
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
  ctx.closePath()
  ctx.fillStyle = 'rgba(74,124,89,0.25)'
  ctx.fill()
  ctx.strokeStyle = '#4a7c59'
  ctx.lineWidth = 4
  ctx.stroke()
  pts.forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#4a7c59'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()
  })
}

// ── Render area result table ──────────────────────────────────────
function renderAreaTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  m: AreaMeasurement,
  x: number, y: number, w: number,
  scale: ScaleConfig | null
): number {
  const all = scale ? sqftToAll(m.realSqFt) : null
  const colW = w / 4
  const rowH = 7.5
  const units = UNIT_LIST

  // Grid: 4 columns, 2 rows
  for (let i = 0; i < units.length; i++) {
    const col = i % 4
    const row = Math.floor(i / 4)
    const cx = x + col * colW
    const cy = y + row * rowH

    const isEven = (col + row) % 2 === 0
    doc.setFillColor(isEven ? 248 : 242, isEven ? 244 : 238, isEven ? 235 : 228)
    doc.rect(cx, cy, colW, rowH, 'F')
    doc.setDrawColor(220, 200, 170)
    doc.setLineWidth(0.2)
    doc.rect(cx, cy, colW, rowH)

    doc.setTextColor(100, 80, 50)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(units[i].en, cx + 2, cy + 2.8)

    doc.setTextColor(26, 20, 16)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    const val = all ? formatUnit(all[units[i].key]) : '—'
    doc.text(val, cx + 2, cy + 5.8)
  }

  return y + Math.ceil(units.length / 4) * rowH
}

// ── Render distance result ────────────────────────────────────────
function renderDistanceTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  m: DistanceMeasurement,
  x: number, y: number, w: number,
  scale: ScaleConfig | null
): number {
  const feet = scale ? m.realFeet : null
  const rows = [
    { label: 'Feet',   val: feet ? formatUnit(feet, 2) : '—' },
    { label: 'Meters', val: feet ? formatUnit(feet * 0.3048, 2) : '—' },
    { label: 'Miles',  val: feet ? formatUnit(feet / 5280, 4) : '—' },
    { label: 'Km',     val: feet ? formatUnit(feet * 0.3048 / 1000, 4) : '—' },
  ]
  const colW = w / 4
  const rowH = 7.5

  rows.forEach((r, i) => {
    const cx = x + i * colW
    const isEven = i % 2 === 0
    doc.setFillColor(isEven ? 248 : 242, isEven ? 244 : 238, isEven ? 235 : 228)
    doc.rect(cx, y, colW, rowH, 'F')
    doc.setDrawColor(220, 200, 170)
    doc.setLineWidth(0.2)
    doc.rect(cx, y, colW, rowH)

    doc.setTextColor(100, 80, 50)
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(r.label, cx + 2, y + 2.8)

    doc.setTextColor(26, 20, 16)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(r.val, cx + 2, y + 5.8)
  })

  return y + rowH
}
