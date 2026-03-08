// imageExport.ts — exports annotated map as PNG image download

import type { Measurement, Point } from '../hooks/useCanvasEngine'

export function exportImage(
  bgCanvas: HTMLCanvasElement,
  measurements: Measurement[],
  fileName: string
): void {
  const out = document.createElement('canvas')
  out.width  = bgCanvas.width
  out.height = bgCanvas.height
  const ctx = out.getContext('2d')!

  // Draw map
  ctx.drawImage(bgCanvas, 0, 0)

  // Draw measurements
  measurements.forEach(m => {
    if (m.type === 'distance') drawLine(ctx, m.points[0], m.points[1])
    else drawPolygon(ctx, m.points)
  })

  // Branding watermark bottom-right
  const pad = 24
  const text = 'JomiMap · jomimap.vercel.app'
  ctx.font = `bold ${Math.max(18, out.width * 0.012)}px monospace`
  const tw = ctx.measureText(text).width
  const th = Math.max(18, out.width * 0.012) * 1.6
  const bx = out.width  - tw - pad * 2
  const by = out.height - th - pad

  ctx.fillStyle = 'rgba(26,20,16,0.65)'
  roundRect(ctx, bx - 10, by - 4, tw + 20, th + 4, 6)
  ctx.fill()

  ctx.fillStyle = 'rgba(240,232,216,0.9)'
  ctx.fillText(text, bx, by + th * 0.72)

  // Trigger download
  const link = document.createElement('a')
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'map'
  link.download = `JomiMap_${baseName}.png`
  link.href = out.toDataURL('image/png')
  link.click()
}

function drawLine(ctx: CanvasRenderingContext2D, a: Point, b: Point) {
  const lw = Math.max(3, ctx.canvas.width * 0.003)
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
  ctx.strokeStyle = '#e85d2a'; ctx.lineWidth = lw
  ctx.setLineDash([lw * 3, lw * 1.5]); ctx.stroke(); ctx.setLineDash([])
  ;[a, b].forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, lw * 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#e85d2a'; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = lw * 0.8; ctx.stroke()
  })
}

function drawPolygon(ctx: CanvasRenderingContext2D, pts: Point[]) {
  if (pts.length < 3) return
  const lw = Math.max(3, ctx.canvas.width * 0.003)
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
  ctx.closePath()
  ctx.fillStyle = 'rgba(74,124,89,0.22)'; ctx.fill()
  ctx.strokeStyle = '#4a7c59'; ctx.lineWidth = lw; ctx.stroke()
  pts.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x, p.y, lw * 2, 0, Math.PI * 2)
    ctx.fillStyle = '#4a7c59'; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = lw * 0.8; ctx.stroke()
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
