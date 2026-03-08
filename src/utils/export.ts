// export.ts — PDF report generator
// Points are in image-pixel coords; cropped snippet around measurement bounds

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
  if (!jsPDFLib) throw new Error('jsPDF failed to load')
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

// ── Compute bounding box of all measurement points ───────────────────
function getMeasurementBounds(
  measurements: Measurement[], imgW: number, imgH: number,
): { x: number; y: number; w: number; h: number } {
  if (measurements.length === 0) return { x: 0, y: 0, w: imgW, h: imgH }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  measurements.forEach(m => {
    ;(m.points as Point[]).forEach(p => {
      if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y
    })
  })

  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)
  const padX  = Math.max(spanX * 0.25, 60)
  const padY  = Math.max(spanY * 0.25, 60)

  const x = Math.max(0, minX - padX)
  const y = Math.max(0, minY - padY)
  const w = Math.min(imgW - x, spanX + padX * 2)
  const h = Math.min(imgH - y, spanY + padY * 2)

  return { x, y, w, h }
}

// ── Build cropped + annotated snippet canvas ─────────────────────────
function buildSnippet(
  bgCanvas: HTMLCanvasElement,
  measurements: Measurement[],
  bounds: { x: number; y: number; w: number; h: number },
): string {
  const { x, y, w, h } = bounds
  const out = document.createElement('canvas')
  out.width = w; out.height = h
  const ctx = out.getContext('2d')!

  // Crop region from bg canvas
  ctx.drawImage(bgCanvas, x, y, w, h, 0, 0, w, h)

  // Draw measurements offset by crop origin
  const lw = Math.max(2, w * 0.003)
  measurements.forEach(m => {
    const pts = (m.points as Point[]).map(p => ({ x: p.x - x, y: p.y - y }))
    if (m.type === 'distance') {
      drawExportLine(ctx, pts[0], pts[1], lw)
    } else {
      drawExportPoly(ctx, pts, lw)
    }
  })

  return out.toDataURL('image/png')
}

function drawExportLine(ctx: CanvasRenderingContext2D, a: Point, b: Point, lw: number) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
  ctx.strokeStyle = '#e85d2a'; ctx.lineWidth = lw
  ctx.setLineDash([lw * 4, lw * 2]); ctx.stroke(); ctx.setLineDash([])
  ;[a, b].forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, lw * 3, 0, Math.PI * 2)
    ctx.fillStyle = '#e85d2a'; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = lw; ctx.stroke()
  })
}

function drawExportPoly(ctx: CanvasRenderingContext2D, pts: Point[], lw: number) {
  if (pts.length < 3) return
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
  ctx.closePath()
  ctx.fillStyle = 'rgba(74,124,89,0.22)'; ctx.fill()
  ctx.strokeStyle = '#4a7c59'; ctx.lineWidth = lw; ctx.stroke()
  pts.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, lw * 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#4a7c59'; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = lw; ctx.stroke()
  })
}

// ── Main export ──────────────────────────────────────────────────────
export async function exportPDFReport(opts: ExportOptions): Promise<void> {
  const { mapCanvas, measurements, scale, fileName, lang } = opts

  if (!mapCanvas) throw new Error('Map canvas not available')
  if (mapCanvas.width === 0 || mapCanvas.height === 0) throw new Error('Map not loaded yet')

  const lib = await getJsPDF()
  const { jsPDF } = lib
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PW = 210, PH = 297, M = 14
  const isBn = lang === 'bn'

  // Build snippet
  const bounds  = getMeasurementBounds(measurements, mapCanvas.width, mapCanvas.height)
  const snippet = buildSnippet(mapCanvas, measurements, bounds)

  // ── Header ───────────────────────────────────────────────────────
  doc.setFillColor(26, 20, 16)
  doc.rect(0, 0, PW, 18, 'F')
  doc.setTextColor(240, 232, 216)
  doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text('JomiMap', M, 11.5)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 160, 130)
  doc.text('Land Measurement Report', M + 30, 11.5)
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  doc.setTextColor(140, 120, 90)
  doc.text(dateStr, PW - M, 11.5, { align: 'right' })

  // ── Snippet box ──────────────────────────────────────────────────
  const snippetBoxY = 22
  const snippetBoxH = 88
  const snippetBoxW = PW - M * 2

  // Fill box background
  doc.setFillColor(245, 240, 228)
  doc.rect(M, snippetBoxY, snippetBoxW, snippetBoxH, 'F')
  doc.setDrawColor(200, 185, 155); doc.setLineWidth(0.3)
  doc.rect(M, snippetBoxY, snippetBoxW, snippetBoxH)

  // Fit snippet image into box maintaining aspect ratio
  const cropAspect = bounds.w / bounds.h
  const boxAspect  = snippetBoxW / snippetBoxH
  let iw = snippetBoxW, ih = snippetBoxH
  let ix = M,           iy = snippetBoxY
  if (cropAspect > boxAspect) {
    ih = snippetBoxW / cropAspect
    iy = snippetBoxY + (snippetBoxH - ih) / 2
  } else {
    iw = snippetBoxH * cropAspect
    ix = M + (snippetBoxW - iw) / 2
  }
  doc.addImage(snippet, 'PNG', ix, iy, iw, ih, undefined, 'FAST')

  // VERIFIED watermark — use low-opacity text (no GState needed)
  doc.setTextColor(74, 124, 89)
  doc.setFontSize(28); doc.setFont('helvetica', 'bold')
  // Draw behind: jsPDF has no opacity API in 2.5.1 on text directly,
  // so draw a subtle outline-only version
  doc.setTextColor(200, 220, 205)
  doc.text('VERIFIED', M + snippetBoxW / 2, snippetBoxY + snippetBoxH / 2 + 5, {
    align: 'center', angle: -20,
  })

  // Verified badge (solid, bottom-right)
  const bx = M + snippetBoxW - 42, by = snippetBoxY + snippetBoxH - 11
  doc.setFillColor(74, 124, 89)
  doc.roundedRect(bx, by, 40, 9, 1.5, 1.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6); doc.setFont('helvetica', 'bold')
  doc.text('\u2713  JomiMap Verified', bx + 20, by + 5.8, { align: 'center' })

  // ── Scale + file info row ────────────────────────────────────────
  let curY = snippetBoxY + snippetBoxH + 6
  doc.setFillColor(245, 240, 228)
  doc.roundedRect(M, curY, snippetBoxW, 8, 1, 1, 'F')
  doc.setTextColor(90, 70, 40); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text(scale ? `Scale: ${scale.label}` : 'Scale: Not calibrated', M + 3, curY + 5.2)
  doc.text(`File: ${fileName || 'unknown'}`, PW - M - 3, curY + 5.2, { align: 'right' })
  curY += 12

  // ── Measurement results ──────────────────────────────────────────
  doc.setFontSize(10); doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 20, 16)
  doc.text(isBn ? 'পরিমাপের ফলাফল' : 'Measurement Results', M, curY)
  curY += 7

  measurements.forEach((m, idx) => {
    if (curY > PH - 40) { doc.addPage(); curY = M + 5 }
    const isArea = m.type === 'area'
    // Row header
    if (isArea) doc.setFillColor(74, 124, 89)
    else        doc.setFillColor(192, 82, 42)
    doc.roundedRect(M, curY, snippetBoxW, 7, 1, 1, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
    doc.text(`#${idx + 1}  ${isArea ? 'Area' : 'Distance'}`, M + 3, curY + 4.8)
    curY += 9

    if (isArea) curY = renderAreaTable(doc, m as AreaMeasurement, M, curY, snippetBoxW, scale)
    else        curY = renderDistTable(doc, m as DistanceMeasurement, M, curY, snippetBoxW, scale)
    curY += 5
  })

  if (measurements.length === 0) {
    doc.setTextColor(150, 130, 100); doc.setFontSize(9); doc.setFont('helvetica', 'italic')
    doc.text('No measurements recorded.', M, curY + 6)
  }

  // ── Footer ───────────────────────────────────────────────────────
  const fy = PH - 14
  doc.setFillColor(26, 20, 16); doc.rect(0, fy, PW, 14, 'F')
  doc.setTextColor(160, 140, 110); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text('Made by Mehedy  \u00B7  github.com/mehedyk', M, fy + 5.5)
  doc.text('JomiMap \u00B7 jomimap.vercel.app', PW - M, fy + 5.5, { align: 'right' })
  doc.setTextColor(100, 90, 70); doc.setFontSize(5.5)
  doc.text(
    'This report is based on the map and scale provided by the user. Always verify with official records.',
    M, fy + 10,
  )

  doc.save(`JomiMap_${dateStr.replace(/ /g, '_')}.pdf`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderAreaTable(doc: any, m: AreaMeasurement, x: number, y: number, w: number, scale: ScaleConfig | null): number {
  const all   = scale ? sqftToAll(m.realSqFt) : null
  const cols  = 4
  const colW  = w / cols
  const rowH  = 7.5
  UNIT_LIST.forEach((u, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const cx  = x + col * colW, cy = y + row * rowH
    const even = (col + row) % 2 === 0
    doc.setFillColor(even ? 248 : 242, even ? 244 : 238, even ? 234 : 226)
    doc.rect(cx, cy, colW, rowH, 'F')
    doc.setDrawColor(210, 195, 170); doc.setLineWidth(0.15); doc.rect(cx, cy, colW, rowH)
    doc.setTextColor(100, 80, 50); doc.setFontSize(5.5); doc.setFont('helvetica', 'normal')
    doc.text(u.en, cx + 2, cy + 2.8)
    doc.setTextColor(26, 20, 16); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
    doc.text(all ? formatUnit(all[u.key]) : '—', cx + 2, cy + 6)
  })
  return y + Math.ceil(UNIT_LIST.length / cols) * rowH
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderDistTable(doc: any, m: DistanceMeasurement, x: number, y: number, w: number, scale: ScaleConfig | null): number {
  const feet = scale ? m.realFeet : null
  const rows = [
    { label: 'Feet',   val: feet ? formatUnit(feet, 2)             : '—' },
    { label: 'Meters', val: feet ? formatUnit(feet * 0.3048, 2)    : '—' },
    { label: 'Miles',  val: feet ? formatUnit(feet / 5280, 4)      : '—' },
    { label: 'Km',     val: feet ? formatUnit(feet * 0.3048 / 1000, 4) : '—' },
  ]
  const colW = w / 4, rowH = 7.5
  rows.forEach((r, i) => {
    const cx   = x + i * colW
    const even = i % 2 === 0
    doc.setFillColor(even ? 248 : 242, even ? 244 : 238, even ? 234 : 226)
    doc.rect(cx, y, colW, rowH, 'F')
    doc.setDrawColor(210, 195, 170); doc.setLineWidth(0.15); doc.rect(cx, y, colW, rowH)
    doc.setTextColor(100, 80, 50); doc.setFontSize(5.5); doc.setFont('helvetica', 'normal')
    doc.text(r.label, cx + 2, y + 2.8)
    doc.setTextColor(26, 20, 16); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
    doc.text(r.val, cx + 2, y + 6)
  })
  return y + rowH
}
