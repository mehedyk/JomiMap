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

interface CanvasState {
  offsetX: number; offsetY: number; zoom: number
  draftPoints: Point[]; calibratePoints: Point[]
}

const MIN_ZOOM = 0.05
const MAX_ZOOM = 20
const PR = 6
const LC = '#e85d2a'
const AF = 'rgba(74,124,89,0.22)'
const AS = '#4a7c59'
const CC = '#c0522a'

export function useCanvasEngine(
  scale: ScaleConfig | null,
  onZoomChange?: (pct: number) => void
) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const st = useRef<CanvasState>({
    offsetX: 0, offsetY: 0, zoom: 1,
    draftPoints: [], calibratePoints: [],
  })

  const [tool, setTool]               = useState<Tool>('pan')
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [draftCount, setDraftCount]   = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)

  const panning      = useRef(false)
  const spaceHeld    = useRef(false)         // space-to-pan
  const lastPtr      = useRef<Point>({ x: 0, y: 0 })
  const pinchDist    = useRef<number | null>(null)
  const pinchCenter  = useRef<Point>({ x: 0, y: 0 })
  const dblClickGuard = useRef(false)        // Bug 5 fix: swallow click before dblclick
  const imgDims      = useRef({ w: 0, h: 0 })

  // ── CSS-size the canvas to fill its container ─────────────────────
  // BUG 1 FIX: canvas internal pixel dimensions = image size
  // but CSS dimensions = 100% of container. All coordinate math uses
  // getBoundingClientRect() which now correctly returns container size.
  const sizeCssToContainer = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return
    const cont = cv.parentElement; if (!cont) return
    cv.style.width  = cont.clientWidth  + 'px'
    cv.style.height = cont.clientHeight + 'px'
  }, [])

  // ── Load image ───────────────────────────────────────────────────
  const loadImage = useCallback((dataUrl: string, imgW: number, imgH: number) => {
    const bg = bgCanvasRef.current
    const cv = canvasRef.current
    if (!bg || !cv) return

    imgDims.current = { w: imgW, h: imgH }

    // Internal pixel dimensions = full image resolution
    bg.width  = imgW; bg.height = imgH
    cv.width  = imgW; cv.height = imgH

    // CSS dimensions = fill the container
    sizeCssToContainer()

    const ctx = bg.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)

      // Fit image to container on first load
      const cont = cv.parentElement
      if (cont) {
        const cw = cont.clientWidth, ch = cont.clientHeight
        const z = Math.min(cw / imgW, ch / imgH, 1)
        st.current.zoom    = z
        st.current.offsetX = (cw - imgW * z) / 2
        st.current.offsetY = (ch - imgH * z) / 2
        onZoomChange?.(Math.round(z * 100))
      }
      setImageLoaded(true)
      redraw()
    }
    img.src = dataUrl
  }, [sizeCssToContainer]) // eslint-disable-line

  // ── Handle container resize ───────────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return
    const ro = new ResizeObserver(() => sizeCssToContainer())
    const cont = cv.parentElement
    if (cont) ro.observe(cont)
    return () => ro.disconnect()
  }, [sizeCssToContainer])

  // ── Redraw ───────────────────────────────────────────────────────
  // IMPORTANT: we draw into a canvas whose internal res = image res,
  // but CSS size = container. ctx.translate/scale handle the mapping.
  const redraw = useCallback(() => {
    const cv = canvasRef.current, bg = bgCanvasRef.current
    if (!cv || !bg) return
    const ctx = cv.getContext('2d')!
    const { offsetX, offsetY, zoom, draftPoints, calibratePoints } = st.current

    // Clear at full internal resolution
    ctx.clearRect(0, 0, cv.width, cv.height)

    // We need to scale from image-space to internal pixel space.
    // cv.width = imgW (internal res), CSS width = container width
    // offsetX/offsetY/zoom are in CSS-pixel space (container coords)
    // We must convert to internal pixel space:
    const cssW = parseFloat(cv.style.width  || String(cv.width))
    const cssH = parseFloat(cv.style.height || String(cv.height))
    const dprX = cv.width  / cssW   // = imgW / containerW
    const dprY = cv.height / cssH   // = imgH / containerH

    ctx.save()
    ctx.scale(dprX, dprY)
    ctx.translate(offsetX, offsetY)
    ctx.scale(zoom, zoom)

    ctx.drawImage(bg, 0, 0)

    measurements.forEach(m => {
      if (m.type === 'distance') drawLine(ctx, m.points[0], m.points[1], LC, zoom)
      else drawPoly(ctx, m.points, AS, AF, zoom, true)
    })

    if (draftPoints.length > 0) {
      if (tool === 'distance') drawDot(ctx, draftPoints[0], LC, zoom)
      else if (tool === 'area') {
        drawPoly(ctx, draftPoints, AS, 'transparent', zoom, false)
        draftPoints.forEach(p => drawDot(ctx, p, AS, zoom))
      }
    }

    if (calibratePoints.length === 1) drawDot(ctx, calibratePoints[0], CC, zoom)
    else if (calibratePoints.length === 2) drawLine(ctx, calibratePoints[0], calibratePoints[1], CC, zoom)

    ctx.restore()
  }, [measurements, tool])

  // ── Draw primitives ───────────────────────────────────────────────
  function drawDot(ctx: CanvasRenderingContext2D, p: Point, c: string, z: number) {
    const r = PR / z
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = c; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2 / z; ctx.stroke()
  }

  function drawLine(ctx: CanvasRenderingContext2D, a: Point, b: Point, c: string, z: number) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = c; ctx.lineWidth = 2.5 / z
    ctx.setLineDash([10 / z, 5 / z]); ctx.stroke(); ctx.setLineDash([])
    drawDot(ctx, a, c, z); drawDot(ctx, b, c, z)
  }

  function drawPoly(ctx: CanvasRenderingContext2D, pts: Point[], stroke: string, fill: string, z: number, closed: boolean) {
    if (pts.length < 2) return
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    if (closed) ctx.closePath()
    ctx.strokeStyle = stroke; ctx.lineWidth = 2.5 / z; ctx.stroke()
    if (closed && pts.length >= 3 && fill !== 'transparent') {
      ctx.fillStyle = fill; ctx.fill()
    }
  }

  // ── Screen → image-space coords ───────────────────────────────────
  // BUG 1+2 FIX: getBoundingClientRect() now returns the CSS rect
  // (container size), so pointer math is correct.
  const s2c = useCallback((clientX: number, clientY: number): Point => {
    const cv = canvasRef.current!
    const rect = cv.getBoundingClientRect()   // CSS rect = container size ✓
    const { offsetX, offsetY, zoom } = st.current
    return {
      x: (clientX - rect.left  - offsetX) / zoom,
      y: (clientY - rect.top   - offsetY) / zoom,
    }
  }, [])

  // ── Click ─────────────────────────────────────────────────────────
  const handleClick = useCallback((clientX: number, clientY: number) => {
    // Bug 5 fix: if a dblclick just fired, swallow this click
    if (dblClickGuard.current) { dblClickGuard.current = false; return }
    if (!imageLoaded) return

    const activeTool = spaceHeld.current ? 'pan' : tool
    if (activeTool === 'pan') return

    const pt = s2c(clientX, clientY)
    const s = st.current

    if (activeTool === 'calibrate') {
      if (s.calibratePoints.length < 2) {
        s.calibratePoints = [...s.calibratePoints, pt]
        setDraftCount(c => c + 1); redraw()
      }
      return
    }

    if (activeTool === 'distance') {
      s.draftPoints = [...s.draftPoints, pt]
      if (s.draftPoints.length === 2) {
        const [a, b] = s.draftPoints as [Point, Point]
        const pd = pixelDistance(a, b)
        setMeasurements(prev => [...prev, {
          id: crypto.randomUUID(), type: 'distance',
          points: [a, b], pixelDist: pd,
          realFeet: scale ? pixelsToFeet(pd, scale) : 0,
        }])
        s.draftPoints = []
      }
      setDraftCount(c => c + 1); redraw(); return
    }

    if (activeTool === 'area') {
      s.draftPoints = [...s.draftPoints, pt]
      setDraftCount(c => c + 1); redraw()
    }
  }, [tool, imageLoaded, scale, s2c, redraw])

  // ── Double-click → close area polygon ────────────────────────────
  const handleDbl = useCallback((_clientX: number, _clientY: number) => {
    // Bug 5 fix: set guard so the preceding click is swallowed
    dblClickGuard.current = true
    setTimeout(() => { dblClickGuard.current = false }, 300)

    if (tool !== 'area') return
    const s = st.current
    if (s.draftPoints.length < 3) return

    const pts = s.draftPoints
    const pa = polygonPixelArea(pts)
    setMeasurements(prev => [...prev, {
      id: crypto.randomUUID(), type: 'area',
      points: pts, pixelArea: pa,
      realSqFt: scale ? pixelAreaToSqFt(pa, scale) : 0,
    }])
    s.draftPoints = []; setDraftCount(c => c + 1); redraw()
  }, [tool, scale, redraw])

  // ── Pan ───────────────────────────────────────────────────────────
  const startPan = useCallback((x: number, y: number) => {
    panning.current = true; lastPtr.current = { x, y }
  }, [])

  const movePan = useCallback((x: number, y: number) => {
    if (!panning.current) return
    st.current.offsetX += x - lastPtr.current.x
    st.current.offsetY += y - lastPtr.current.y
    lastPtr.current = { x, y }; redraw()
  }, [redraw])

  const endPan = useCallback(() => { panning.current = false }, [])

  // ── Zoom to cursor ────────────────────────────────────────────────
  // BUG 2 FIX: rect is now CSS rect, math is correct
  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const s = st.current
    const cv = canvasRef.current!
    const rect = cv.getBoundingClientRect()
    const mx = clientX - rect.left   // mouse pos in container CSS pixels
    const my = clientY - rect.top
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoom * factor))
    const ratio = newZoom / s.zoom
    s.offsetX = mx - ratio * (mx - s.offsetX)
    s.offsetY = my - ratio * (my - s.offsetY)
    s.zoom = newZoom
    onZoomChange?.(Math.round(newZoom * 100))
    redraw()
  }, [redraw, onZoomChange])

  // ── Spacebar pan (industry standard) ─────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        spaceHeld.current = true
        const cv = canvasRef.current
        if (cv) cv.style.cursor = 'grab'
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld.current = false
        const cv = canvasRef.current
        if (cv) cv.style.cursor = ''
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
    }
  }, [])

  // ── Mouse event handlers ──────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    // Smooth zoom: trackpad sends small deltas, wheel sends large ones
    const factor = e.deltaMode === 0
      ? Math.pow(1.001, -e.deltaY)   // trackpad — smooth
      : e.deltaY < 0 ? 1.15 : 1 / 1.15  // mouse wheel — stepped
    zoomAt(e.clientX, e.clientY, factor)
  }, [zoomAt])

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Left click pan when tool=pan or space held; middle mouse always pans
    if (e.button === 1 || tool === 'pan' || spaceHeld.current) {
      e.preventDefault(); startPan(e.clientX, e.clientY)
    }
  }, [tool, startPan])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    movePan(e.clientX, e.clientY)
  }, [movePan])

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 2) endPan()
  }, [endPan])

  const onMouseClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'pan' && !spaceHeld.current && e.button === 0) {
      handleClick(e.clientX, e.clientY)
    }
  }, [tool, handleClick])

  const onDoubleClickCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    handleDbl(e.clientX, e.clientY)
  }, [handleDbl])

  // ── Touch handlers ────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchDist.current = Math.sqrt(dx * dx + dy * dy)
      pinchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      }
      return
    }
    startPan(e.touches[0].clientX, e.touches[0].clientY)
  }, [startPan])

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length === 2 && pinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const d = Math.sqrt(dx * dx + dy * dy)
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      zoomAt(cx, cy, d / pinchDist.current)
      // Also pan with pinch midpoint drift
      movePan(cx, cy)
      pinchDist.current = d
      pinchCenter.current = { x: cx, y: cy }
      return
    }
    if (tool === 'pan') movePan(e.touches[0].clientX, e.touches[0].clientY)
  }, [tool, movePan, zoomAt])

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    pinchDist.current = null; endPan()
    if (e.changedTouches.length === 1 && tool !== 'pan' && !spaceHeld.current) {
      handleClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
    }
  }, [tool, endPan, handleClick])

  // ── Undo / clear / remove ─────────────────────────────────────────
  const undo = useCallback(() => {
    const s = st.current
    if (s.draftPoints.length > 0) {
      s.draftPoints = s.draftPoints.slice(0, -1)
      setDraftCount(c => c + 1)
    } else {
      setMeasurements(p => p.slice(0, -1))
    }
    redraw()
  }, [redraw])

  const clearAll = useCallback(() => {
    st.current.draftPoints = []; st.current.calibratePoints = []
    setMeasurements([]); setDraftCount(0); redraw()
  }, [redraw])

  const clearCalibrate = useCallback(() => {
    st.current.calibratePoints = []; setDraftCount(c => c + 1); redraw()
  }, [redraw])

  const removeById = useCallback((id: string) => {
    setMeasurements(p => p.filter(m => m.id !== id))
  }, [])

  const getCalibratePxDistance = useCallback((): number | null => {
    const pts = st.current.calibratePoints
    return pts.length === 2 ? pixelDistance(pts[0], pts[1]) : null
  }, [])

  useEffect(() => { redraw() }, [measurements, redraw])

  return {
    canvasRef, bgCanvasRef,
    tool, setTool,
    measurements, draftCount, imageLoaded,
    loadImage,
    onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseClick, onDoubleClickCanvas,
    onTouchStart, onTouchMove, onTouchEnd,
    undo, clearAll, clearCalibrate, removeById, getCalibratePxDistance,
    zoomIn:  (cx: number, cy: number) => zoomAt(cx, cy, 1.25),
    zoomOut: (cx: number, cy: number) => zoomAt(cx, cy, 1 / 1.25),
    currentZoom: () => st.current.zoom,
    // expose for export: canvas offset/zoom state
    getViewState: () => ({ ...st.current }),
  }
}
