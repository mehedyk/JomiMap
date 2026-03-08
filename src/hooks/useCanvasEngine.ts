import { useRef, useState, useCallback, useEffect } from 'react'
import { pixelDistance, polygonPixelArea, pixelsToFeet, pixelAreaToSqFt } from '../utils/scale'
import type { ScaleConfig } from '../utils/scale'

export type Tool = 'pan' | 'distance' | 'area' | 'calibrate'
export interface Point { x: number; y: number }

export interface DistanceMeasurement {
  id: string; type: 'distance'
  points: [Point, Point]; pixelDist: number; realFeet: number
}
export interface AreaMeasurement {
  id: string; type: 'area'
  points: Point[]; pixelArea: number; realSqFt: number
}
export type Measurement = DistanceMeasurement | AreaMeasurement

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATE SYSTEM (one space, no confusion)
//
// "img coords"    — pixels on the source image (0..imgW, 0..imgH)
//                   stored in measurement.points, draftPoints, calibratePoints
//
// "screen coords" — CSS pixels on the canvas element / page
//                   used for mouse/touch events
//
// canvas.width/height = imgW/imgH  (internal resolution = image)
// canvas CSS width/height = container size  (set by ResizeObserver)
//
// To draw: ctx.setTransform(dpr, 0, 0, dpr, offsetX*dpr, offsetY*dpr)
//          then ctx.scale(zoom, zoom)
// where dpr = canvas.width / canvas.clientWidth  (maps CSS px → internal px)
// offsetX/offsetY/zoom live in CSS pixel space
//
// screenToImg(sx, sy):
//   rect = canvas.getBoundingClientRect()  ← CSS pixels, correct size
//   return { x: (sx - rect.left - offsetX) / zoom,
//            y: (sy - rect.top  - offsetY) / zoom }
// ─────────────────────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.02
const MAX_ZOOM = 40
const DOT_R    = 5    // dot radius in screen pixels (stays constant regardless of zoom)
const LINE_W   = 2    // line width in screen pixels

// Colors
const C_DIST   = '#e85d2a'
const C_AREA   = '#4a7c59'
const C_CALIB  = '#9333ea'
const C_FILL   = 'rgba(74,124,89,0.18)'
const C_CURSOR = 'rgba(255,255,255,0.85)'

export function useCanvasEngine(
  scale: ScaleConfig | null,
  onZoomChange?: (pct: number) => void,
) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)

  // viewport state — all in CSS pixel space
  const vp = useRef({ offsetX: 0, offsetY: 0, zoom: 1 })

  // drawing state
  const draft      = useRef<Point[]>([])
  const calibPts   = useRef<Point[]>([])
  const cursorPos  = useRef<Point | null>(null)  // live mouse pos in img coords

  const [tool, setTool]             = useState<Tool>('pan')
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [, forceRedraw]             = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgDims                     = useRef({ w: 1, h: 1 })

  const panning       = useRef(false)
  const spaceHeld     = useRef(false)
  const lastPtr       = useRef<Point>({ x: 0, y: 0 })
  const pinchDist     = useRef<number | null>(null)
  const dblGuard      = useRef(false)

  // ── Fit canvas CSS size to container ────────────────────────────
  const fitCss = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return
    const cont = cv.parentElement; if (!cont) return
    cv.style.width  = cont.clientWidth  + 'px'
    cv.style.height = cont.clientHeight + 'px'
  }, [])

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const cont = cv.parentElement; if (!cont) return
    const ro = new ResizeObserver(() => { fitCss(); redraw() })
    ro.observe(cont)
    return () => ro.disconnect()
  }, []) // eslint-disable-line

  // ── Load image ───────────────────────────────────────────────────
  const loadImage = useCallback((dataUrl: string, imgW: number, imgH: number) => {
    const bg = bgCanvasRef.current, cv = canvasRef.current
    if (!bg || !cv) return

    imgDims.current = { w: imgW, h: imgH }
    bg.width = imgW;  bg.height = imgH
    cv.width = imgW;  cv.height = imgH
    fitCss()

    const ctx = bg.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, imgW, imgH)
      ctx.drawImage(img, 0, 0)

      // Fit-to-screen on load
      const cw = parseFloat(cv.style.width  || String(cv.width))
      const ch = parseFloat(cv.style.height || String(cv.height))
      const z  = Math.min(cw / imgW, ch / imgH, 1)
      vp.current = {
        zoom:    z,
        offsetX: (cw - imgW * z) / 2,
        offsetY: (ch - imgH * z) / 2,
      }
      onZoomChange?.(Math.round(z * 100))
      draft.current   = []
      calibPts.current = []
      setImageLoaded(true)
      redraw()
    }
    img.src = dataUrl
  }, [fitCss]) // eslint-disable-line

  // ── Redraw ───────────────────────────────────────────────────────
  // All drawing in image-pixel space; transform converts to screen.
  const redraw = useCallback(() => {
    const cv = canvasRef.current, bg = bgCanvasRef.current
    if (!cv || !bg || !cv.style.width) return
    const ctx = cv.getContext('2d')!

    // device pixel ratio correction
    const cssW = parseFloat(cv.style.width)
    const cssH = parseFloat(cv.style.height)
    if (!cssW || !cssH) return

    const dpr = cv.width / cssW   // = imgW / containerWidth

    ctx.clearRect(0, 0, cv.width, cv.height)
    ctx.save()

    // Apply viewport transform:
    // 1. scale by dpr  (css px → internal px)
    // 2. translate by offset (css px)
    // 3. scale by zoom
    ctx.setTransform(dpr, 0, 0, dpr, vp.current.offsetX * dpr, vp.current.offsetY * dpr)
    ctx.scale(vp.current.zoom, vp.current.zoom)

    // Draw map
    ctx.drawImage(bg, 0, 0)

    // Draw committed measurements
    const z = vp.current.zoom
    measurements.forEach((m, idx) => {
      if (m.type === 'distance') {
        drawLine(ctx, m.points[0], m.points[1], C_DIST, z)
        drawNumberBadge(ctx, m.points[0], idx + 1, C_DIST, z)
      } else {
        drawPoly(ctx, m.points, C_AREA, C_FILL, z, true)
        drawNumberBadge(ctx, m.points[0], idx + 1, C_AREA, z)
      }
    })

    // Draw draft points
    const dp = draft.current
    if (dp.length > 0) {
      const activeTool = tool
      if (activeTool === 'distance') {
        drawDot(ctx, dp[0], C_DIST, z)
        drawPointLabel(ctx, dp[0], '1', C_DIST, z)
        // Rubber band to cursor
        if (cursorPos.current) {
          drawRubberBand(ctx, dp[0], cursorPos.current, C_DIST, z)
        }
      } else if (activeTool === 'area' || activeTool === 'calibrate') {
        const color = activeTool === 'calibrate' ? C_CALIB : C_AREA
        drawPoly(ctx, dp, color, 'transparent', z, false)
        dp.forEach((p, i) => {
          drawDot(ctx, p, color, z)
          drawPointLabel(ctx, p, String(i + 1), color, z)
        })
        // Rubber band to cursor
        if (cursorPos.current && dp.length > 0) {
          drawRubberBand(ctx, dp[dp.length - 1], cursorPos.current, color, z)
          // Preview closing line for area
          if (activeTool === 'area' && dp.length >= 2) {
            drawRubberBand(ctx, cursorPos.current, dp[0], color, z, true)
          }
        }
      }
    }

    // Calibrate committed points
    const cp = calibPts.current
    if (cp.length >= 1) drawDot(ctx, cp[0], C_CALIB, z)
    if (cp.length === 2) {
      drawLine(ctx, cp[0], cp[1], C_CALIB, z)
    }

    ctx.restore()

    // Draw crosshair cursor in screen space (stays fixed size)
    if (cursorPos.current && tool !== 'pan' && !spaceHeld.current) {
      const sp = imgToScreen(cursorPos.current)
      drawScreenCrosshair(ctx, sp.x, sp.y)
    }
  }, [measurements, tool]) // eslint-disable-line

  // ── Draw primitives — all in image coords, z-invariant thickness ──
  function drawDot(ctx: CanvasRenderingContext2D, p: Point, c: string, z: number) {
    const r = DOT_R / z
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = c; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5 / z; ctx.stroke()
  }

  function drawLine(ctx: CanvasRenderingContext2D, a: Point, b: Point, c: string, z: number) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = c; ctx.lineWidth = LINE_W / z
    ctx.setLineDash([8 / z, 4 / z]); ctx.stroke(); ctx.setLineDash([])
    drawDot(ctx, a, c, z); drawDot(ctx, b, c, z)
  }

  function drawRubberBand(
    ctx: CanvasRenderingContext2D,
    a: Point, b: Point, c: string, z: number, dim = false,
  ) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = dim ? c + '55' : c + 'aa'
    ctx.lineWidth = LINE_W / z
    ctx.setLineDash([6 / z, 3 / z]); ctx.stroke(); ctx.setLineDash([])
  }

  function drawPoly(
    ctx: CanvasRenderingContext2D,
    pts: Point[], stroke: string, fill: string, z: number, closed: boolean,
  ) {
    if (pts.length < 2) return
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    if (closed) ctx.closePath()
    ctx.strokeStyle = stroke; ctx.lineWidth = LINE_W / z; ctx.stroke()
    if (closed && pts.length >= 3 && fill !== 'transparent') {
      ctx.fillStyle = fill; ctx.fill()
    }
    if (closed) pts.forEach((p, i) => {
      drawDot(ctx, p, stroke, z)
      drawPointLabel(ctx, p, String(i + 1), stroke, z)
    })
  }

  // Point number label — small badge above the dot
  function drawPointLabel(
    ctx: CanvasRenderingContext2D,
    p: Point, label: string, c: string, z: number,
  ) {
    const fs = 11 / z
    const pad = 3 / z
    const r   = 3 / z
    ctx.font = `bold ${fs}px monospace`
    const tw = ctx.measureText(label).width
    const bx = p.x - tw / 2 - pad
    const by = p.y - DOT_R / z - fs - pad * 2 - 2 / z
    const bw = tw + pad * 2
    const bh = fs + pad * 2

    // Badge background
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, r)
    ctx.fillStyle = c; ctx.fill()

    // Label text
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(label, p.x, by + pad)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  // Measurement index badge (larger, top-left of measurement)
  function drawNumberBadge(
    ctx: CanvasRenderingContext2D,
    p: Point, num: number, c: string, z: number,
  ) {
    const fs  = 13 / z
    const pad = 4 / z
    const r   = 4 / z
    const label = `#${num}`
    ctx.font = `bold ${fs}px monospace`
    const tw = ctx.measureText(label).width
    const bx = p.x + DOT_R / z + 2 / z
    const by = p.y - fs / 2 - pad

    ctx.beginPath()
    ctx.roundRect(bx, by, tw + pad * 2, fs + pad * 2, r)
    ctx.fillStyle = c; ctx.globalAlpha = 0.9; ctx.fill()
    ctx.globalAlpha = 1

    ctx.fillStyle = 'white'
    ctx.font = `bold ${fs}px monospace`
    ctx.textBaseline = 'top'
    ctx.fillText(label, bx + pad, by + pad)
    ctx.textBaseline = 'alphabetic'
  }

  // Crosshair drawn in screen space (fixed pixel size, not affected by zoom)
  function drawScreenCrosshair(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
    const size = 12, gap = 4
    ctx.save()
    ctx.resetTransform()
    ctx.strokeStyle = C_CURSOR; ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(sx, sy - size); ctx.lineTo(sx, sy - gap)
    ctx.moveTo(sx, sy + gap);  ctx.lineTo(sx, sy + size)
    ctx.moveTo(sx - size, sy); ctx.lineTo(sx - gap, sy)
    ctx.moveTo(sx + gap,  sy); ctx.lineTo(sx + size, sy)
    ctx.stroke()
    // Center dot
    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2)
    ctx.fillStyle = C_CURSOR; ctx.fill()
    ctx.restore()
  }

  // ── Coordinate conversions ───────────────────────────────────────
  const screenToImg = useCallback((clientX: number, clientY: number): Point => {
    const cv = canvasRef.current!
    const rect = cv.getBoundingClientRect()
    const { offsetX, offsetY, zoom } = vp.current
    return {
      x: (clientX - rect.left  - offsetX) / zoom,
      y: (clientY - rect.top   - offsetY) / zoom,
    }
  }, [])

  const imgToScreen = useCallback((p: Point): Point => {
    const cv = canvasRef.current!
    const rect = cv.getBoundingClientRect()
    const { offsetX, offsetY, zoom } = vp.current
    return {
      x: rect.left + offsetX + p.x * zoom,
      y: rect.top  + offsetY + p.y * zoom,
    }
  }, [])

  // ── Zoom — pure screen-space pivot ──────────────────────────────
  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const cv = canvasRef.current; if (!cv) return
    const rect = cv.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const { zoom, offsetX, offsetY } = vp.current
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor))
    const ratio = newZoom / zoom
    vp.current.zoom    = newZoom
    vp.current.offsetX = mx - ratio * (mx - offsetX)
    vp.current.offsetY = my - ratio * (my - offsetY)
    onZoomChange?.(Math.round(newZoom * 100))
    redraw()
  }, [redraw, onZoomChange])

  // ── Auto-zoom to a point (used after placing each point) ─────────
  const softZoomToPoint = useCallback((p: Point) => {
    const cv = canvasRef.current; if (!cv) return
    const cssW = parseFloat(cv.style.width)
    const cssH = parseFloat(cv.style.height)
    if (!cssW || !cssH) return
    const { zoom } = vp.current
    // Only auto-zoom if point would land within 15% of any edge
    const sx = vp.current.offsetX + p.x * zoom
    const sy = vp.current.offsetY + p.y * zoom
    const margin = 0.15
    const tooClose = sx < cssW * margin || sx > cssW * (1 - margin) ||
                     sy < cssH * margin || sy > cssH * (1 - margin)
    if (!tooClose) return
    // Pan to center it
    vp.current.offsetX = cssW / 2 - p.x * zoom
    vp.current.offsetY = cssH / 2 - p.y * zoom
    redraw()
  }, [redraw])

  // ── Click handler ─────────────────────────────────────────────────
  const handleClick = useCallback((clientX: number, clientY: number) => {
    if (dblGuard.current) { dblGuard.current = false; return }
    if (!imageLoaded) return
    const activeTool = spaceHeld.current ? 'pan' : tool
    if (activeTool === 'pan') return

    const pt = screenToImg(clientX, clientY)

    if (activeTool === 'calibrate') {
      if (calibPts.current.length < 2) {
        calibPts.current = [...calibPts.current, pt]
        forceRedraw(n => n + 1); redraw()
      }
      return
    }

    if (activeTool === 'distance') {
      draft.current = [...draft.current, pt]
      if (draft.current.length === 2) {
        const [a, b] = draft.current as [Point, Point]
        const pd = pixelDistance(a, b)
        setMeasurements(prev => [...prev, {
          id: crypto.randomUUID(), type: 'distance',
          points: [a, b], pixelDist: pd,
          realFeet: scale ? pixelsToFeet(pd, scale) : 0,
        }])
        draft.current = []
      } else {
        softZoomToPoint(pt)
      }
      forceRedraw(n => n + 1); redraw(); return
    }

    if (activeTool === 'area') {
      draft.current = [...draft.current, pt]
      softZoomToPoint(pt)
      forceRedraw(n => n + 1); redraw()
    }
  }, [tool, imageLoaded, scale, screenToImg, redraw, softZoomToPoint])

  // ── Double-click → close polygon ─────────────────────────────────
  const handleDbl = useCallback((_cx: number, _cy: number) => {
    dblGuard.current = true
    setTimeout(() => { dblGuard.current = false }, 300)
    if (tool !== 'area') return
    if (draft.current.length < 3) return
    const pts = [...draft.current]
    const pa  = polygonPixelArea(pts)
    setMeasurements(prev => [...prev, {
      id: crypto.randomUUID(), type: 'area',
      points: pts, pixelArea: pa,
      realSqFt: scale ? pixelAreaToSqFt(pa, scale) : 0,
    }])
    draft.current = []
    forceRedraw(n => n + 1); redraw()
  }, [tool, scale, redraw])

  // ── Pan ───────────────────────────────────────────────────────────
  const startPan = useCallback((x: number, y: number) => {
    panning.current = true; lastPtr.current = { x, y }
  }, [])
  const movePan = useCallback((x: number, y: number) => {
    if (!panning.current) return
    vp.current.offsetX += x - lastPtr.current.x
    vp.current.offsetY += y - lastPtr.current.y
    lastPtr.current = { x, y }; redraw()
  }, [redraw])
  const endPan = useCallback(() => { panning.current = false }, [])

  // ── Space-to-pan ─────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault(); spaceHeld.current = true
        const cv = canvasRef.current; if (cv) cv.style.cursor = 'grab'
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld.current = false
        const cv = canvasRef.current; if (cv) cv.style.cursor = ''
      }
    }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // ── Mouse events ─────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const factor = e.deltaMode === 0
      ? Math.pow(1.0008, -e.deltaY)          // trackpad: very smooth
      : e.deltaY < 0 ? 1.15 : 1 / 1.15      // mouse wheel: stepped
    zoomAt(e.clientX, e.clientY, factor)
  }, [zoomAt])

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || tool === 'pan' || spaceHeld.current) {
      e.preventDefault(); startPan(e.clientX, e.clientY)
    }
  }, [tool, startPan])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    movePan(e.clientX, e.clientY)
    if (tool !== 'pan' && !spaceHeld.current) {
      cursorPos.current = screenToImg(e.clientX, e.clientY)
      redraw()
    } else {
      if (cursorPos.current) { cursorPos.current = null; redraw() }
    }
  }, [tool, movePan, screenToImg, redraw])

  const onMouseLeave = useCallback(() => {
    cursorPos.current = null; redraw()
  }, [redraw])

  const onMouseUp   = useCallback((e: React.MouseEvent) => { if (e.button !== 2) endPan() }, [endPan])
  const onMouseClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'pan' && !spaceHeld.current && e.button === 0) handleClick(e.clientX, e.clientY)
  }, [tool, handleClick])
  const onDoubleClickCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    handleDbl(e.clientX, e.clientY)
  }, [handleDbl])

  // ── Touch events ─────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchDist.current = Math.sqrt(dx * dx + dy * dy)
      endPan(); return
    }
    startPan(e.touches[0].clientX, e.touches[0].clientY)
  }, [startPan, endPan])

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length === 2 && pinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const d  = Math.sqrt(dx * dx + dy * dy)
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      zoomAt(cx, cy, d / pinchDist.current)
      pinchDist.current = d; return
    }
    movePan(e.touches[0].clientX, e.touches[0].clientY)
  }, [movePan, zoomAt])

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    pinchDist.current = null; endPan()
    if (e.changedTouches.length === 1 && tool !== 'pan' && !spaceHeld.current) {
      handleClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
    }
  }, [tool, endPan, handleClick])

  // ── Undo / clear / remove ─────────────────────────────────────────
  const undo = useCallback(() => {
    if (draft.current.length > 0) {
      draft.current = draft.current.slice(0, -1)
      forceRedraw(n => n + 1); redraw()
    } else {
      setMeasurements(p => p.slice(0, -1))
    }
  }, [redraw])

  const clearAll = useCallback(() => {
    draft.current = []; calibPts.current = []
    setMeasurements([]); forceRedraw(n => n + 1); redraw()
  }, [redraw])

  const clearCalibrate = useCallback(() => {
    calibPts.current = []; forceRedraw(n => n + 1); redraw()
  }, [redraw])

  const removeById = useCallback((id: string) => {
    setMeasurements(p => p.filter(m => m.id !== id))
  }, [])

  const getCalibratePxDistance = useCallback((): number | null => {
    const pts = calibPts.current
    return pts.length === 2 ? pixelDistance(pts[0], pts[1]) : null
  }, [])

  useEffect(() => { redraw() }, [measurements, redraw])

  return {
    canvasRef, bgCanvasRef,
    tool, setTool,
    measurements, imageLoaded,
    loadImage,
    onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
    onMouseClick, onDoubleClickCanvas,
    onTouchStart, onTouchMove, onTouchEnd,
    undo, clearAll, clearCalibrate, removeById, getCalibratePxDistance,
    zoomIn:  (cx: number, cy: number) => zoomAt(cx, cy, 1.3),
    zoomOut: (cx: number, cy: number) => zoomAt(cx, cy, 1 / 1.3),
    currentZoom: () => vp.current.zoom,
    getImgDims: () => ({ ...imgDims.current }),
  }
}
