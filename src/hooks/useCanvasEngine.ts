import { useRef, useState, useCallback, useEffect } from 'react'
import { pixelDistance, polygonPixelArea, pixelsToFeet, pixelAreaToSqFt } from '../utils/scale'
import type { ScaleConfig } from '../utils/scale'

export type Tool = 'pan' | 'distance' | 'area' | 'calibrate'

export interface Point { x: number; y: number }

export interface DistanceMeasurement {
  id: string
  type: 'distance'
  points: [Point, Point]
  pixelDist: number
  realFeet: number
}

export interface AreaMeasurement {
  id: string
  type: 'area'
  points: Point[]
  pixelArea: number
  realSqFt: number
}

export type Measurement = DistanceMeasurement | AreaMeasurement

interface CanvasState {
  // Pan/zoom
  offsetX: number
  offsetY: number
  zoom: number
  // Current tool points being drawn
  draftPoints: Point[]
  // Calibration line
  calibratePoints: Point[]
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 8
const POINT_RADIUS = 6
const LINE_COLOR = '#e85d2a'
const AREA_FILL = 'rgba(74,124,89,0.18)'
const AREA_STROKE = '#4a7c59'
const CALIBRATE_COLOR = '#c0522a'
const DRAFT_COLOR = '#e85d2a'

export function useCanvasEngine(scale: ScaleConfig | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null) // holds the map image
  const stateRef = useRef<CanvasState>({
    offsetX: 0, offsetY: 0, zoom: 1, draftPoints: [], calibratePoints: [],
  })

  const [tool, setTool] = useState<Tool>('pan')
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [draftCount, setDraftCount] = useState(0) // triggers re-render when draft changes
  const [imageLoaded, setImageLoaded] = useState(false)

  // Pointer state for pan
  const isPanning = useRef(false)
  const lastPointer = useRef<Point>({ x: 0, y: 0 })
  // Pinch zoom
  const lastPinchDist = useRef<number | null>(null)

  // ── Load image onto background canvas ──────────────────────────
  const loadImage = useCallback((dataUrl: string, imgW: number, imgH: number) => {
    const bgCanvas = bgCanvasRef.current
    const canvas = canvasRef.current
    if (!bgCanvas || !canvas) return

    bgCanvas.width = imgW
    bgCanvas.height = imgH
    canvas.width = imgW
    canvas.height = imgH

    const ctx = bgCanvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      // Fit to container on first load
      fitToContainer(imgW, imgH)
      setImageLoaded(true)
      redraw()
    }
    img.src = dataUrl
  }, []) // eslint-disable-line

  const fitToContainer = (imgW: number, imgH: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    if (!container) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    const zoomFit = Math.min(cw / imgW, ch / imgH, 1)
    const s = stateRef.current
    s.zoom = zoomFit
    s.offsetX = (cw - imgW * zoomFit) / 2
    s.offsetY = (ch - imgH * zoomFit) / 2
  }

  // ── Core redraw ─────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const bgCanvas = bgCanvasRef.current
    if (!canvas || !bgCanvas) return
    const ctx = canvas.getContext('2d')!
    const { offsetX, offsetY, zoom, draftPoints, calibratePoints } = stateRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(zoom, zoom)

    // Draw background image
    ctx.drawImage(bgCanvas, 0, 0)

    // Draw completed measurements
    measurements.forEach(m => {
      if (m.type === 'distance') drawDistanceLine(ctx, m.points[0], m.points[1])
      else drawAreaPolygon(ctx, m.points, true)
    })

    // Draw draft
    if (draftPoints.length > 0) {
      if (tool === 'distance') {
        drawPoint(ctx, draftPoints[0], DRAFT_COLOR)
      } else if (tool === 'area') {
        drawAreaPolygon(ctx, draftPoints, false)
        draftPoints.forEach(p => drawPoint(ctx, p, AREA_STROKE))
      }
    }

    // Draw calibrate draft
    if (calibratePoints.length === 1) {
      drawPoint(ctx, calibratePoints[0], CALIBRATE_COLOR)
    } else if (calibratePoints.length === 2) {
      drawDistanceLine(ctx, calibratePoints[0], calibratePoints[1], CALIBRATE_COLOR)
    }

    ctx.restore()
  }, [measurements, tool]) // eslint-disable-line

  // ── Drawing helpers ─────────────────────────────────────────────
  function drawPoint(ctx: CanvasRenderingContext2D, p: Point, color: string) {
    const r = POINT_RADIUS / stateRef.current.zoom
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1.5 / stateRef.current.zoom
    ctx.stroke()
  }

  function drawDistanceLine(ctx: CanvasRenderingContext2D, a: Point, b: Point, color = LINE_COLOR) {
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = color
    ctx.lineWidth = 2 / stateRef.current.zoom
    ctx.setLineDash([8 / stateRef.current.zoom, 4 / stateRef.current.zoom])
    ctx.stroke()
    ctx.setLineDash([])
    drawPoint(ctx, a, color)
    drawPoint(ctx, b, color)
  }

  function drawAreaPolygon(ctx: CanvasRenderingContext2D, pts: Point[], closed: boolean) {
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    if (closed) ctx.closePath()
    ctx.strokeStyle = AREA_STROKE
    ctx.lineWidth = 2 / stateRef.current.zoom
    ctx.stroke()
    if (closed && pts.length >= 3) {
      ctx.fillStyle = AREA_FILL
      ctx.fill()
    }
  }

  // ── Coordinate transform ────────────────────────────────────────
  const screenToCanvas = useCallback((sx: number, sy: number): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const { offsetX, offsetY, zoom } = stateRef.current
    const cx = (sx - rect.left - offsetX) / zoom
    const cy = (sy - rect.top - offsetY) / zoom
    return { x: cx, y: cy }
  }, [])

  // ── Handle click/tap ────────────────────────────────────────────
  const handleClick = useCallback((sx: number, sy: number) => {
    if (!imageLoaded) return
    const pt = screenToCanvas(sx, sy)
    const s = stateRef.current

    if (tool === 'pan') return

    if (tool === 'calibrate') {
      if (s.calibratePoints.length < 2) {
        s.calibratePoints = [...s.calibratePoints, pt]
        setDraftCount(c => c + 1)
        redraw()
      }
      return
    }

    if (tool === 'distance') {
      s.draftPoints = [...s.draftPoints, pt]
      if (s.draftPoints.length === 2) {
        const [a, b] = s.draftPoints as [Point, Point]
        const pxDist = pixelDistance(a, b)
        const realFeet = scale ? pixelsToFeet(pxDist, scale) : 0
        const newM: DistanceMeasurement = {
          id: crypto.randomUUID(),
          type: 'distance',
          points: [a, b],
          pixelDist: pxDist,
          realFeet,
        }
        setMeasurements(prev => [...prev, newM])
        s.draftPoints = []
      }
      setDraftCount(c => c + 1)
      redraw()
      return
    }

    if (tool === 'area') {
      s.draftPoints = [...s.draftPoints, pt]
      setDraftCount(c => c + 1)
      redraw()
    }
  }, [tool, imageLoaded, scale, screenToCanvas, redraw])

  // Double-click/double-tap to close area polygon
  const handleDoubleClick = useCallback((sx: number, sy: number) => {
    if (tool !== 'area') return
    const s = stateRef.current
    if (s.draftPoints.length < 3) return

    const pts = s.draftPoints
    const pxArea = polygonPixelArea(pts)
    const realSqFt = scale ? pixelAreaToSqFt(pxArea, scale) : 0
    const newM: AreaMeasurement = {
      id: crypto.randomUUID(),
      type: 'area',
      points: pts,
      pixelArea: pxArea,
      realSqFt,
    }
    setMeasurements(prev => [...prev, newM])
    s.draftPoints = []
    setDraftCount(c => c + 1)
    redraw()
  }, [tool, scale, redraw])

  // ── Pan logic ───────────────────────────────────────────────────
  const startPan = useCallback((x: number, y: number) => {
    isPanning.current = true
    lastPointer.current = { x, y }
  }, [])

  const movePan = useCallback((x: number, y: number) => {
    if (!isPanning.current) return
    const dx = x - lastPointer.current.x
    const dy = y - lastPointer.current.y
    stateRef.current.offsetX += dx
    stateRef.current.offsetY += dy
    lastPointer.current = { x, y }
    redraw()
  }, [redraw])

  const endPan = useCallback(() => { isPanning.current = false }, [])

  // ── Zoom ────────────────────────────────────────────────────────
  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    const s = stateRef.current
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mx = cx - rect.left
    const my = cy - rect.top
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s.zoom * factor))
    const ratio = newZoom / s.zoom
    s.offsetX = mx - ratio * (mx - s.offsetX)
    s.offsetY = my - ratio * (my - s.offsetY)
    s.zoom = newZoom
    redraw()
  }, [redraw])

  // ── Event handlers for canvas element ──────────────────────────
  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    zoomAt(e.clientX, e.clientY, factor)
  }, [zoomAt])

  // Mouse
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') startPan(e.clientX, e.clientY)
  }, [tool, startPan])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') movePan(e.clientX, e.clientY)
  }, [tool, movePan])

  const onMouseUp = useCallback(() => endPan(), [endPan])

  const onMouseClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'pan') handleClick(e.clientX, e.clientY)
  }, [tool, handleClick])

  const onDoubleClickCanvas = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    handleDoubleClick(e.clientX, e.clientY)
  }, [handleDoubleClick])

  // Touch
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
      return
    }
    if (tool === 'pan') startPan(e.touches[0].clientX, e.touches[0].clientY)
  }, [tool, startPan])

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const factor = dist / lastPinchDist.current
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2
      zoomAt(cx, cy, factor)
      lastPinchDist.current = dist
      return
    }
    if (tool === 'pan') movePan(e.touches[0].clientX, e.touches[0].clientY)
  }, [tool, movePan, zoomAt])

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    lastPinchDist.current = null
    endPan()
    if (e.changedTouches.length === 1 && tool !== 'pan') {
      handleClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
    }
  }, [tool, endPan, handleClick])

  // ── Undo ────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    const s = stateRef.current
    if (s.draftPoints.length > 0) {
      s.draftPoints = s.draftPoints.slice(0, -1)
      setDraftCount(c => c + 1)
    } else {
      setMeasurements(prev => prev.slice(0, -1))
    }
    redraw()
  }, [redraw])

  const clearAll = useCallback(() => {
    stateRef.current.draftPoints = []
    stateRef.current.calibratePoints = []
    setMeasurements([])
    setDraftCount(0)
    redraw()
  }, [redraw])

  const clearCalibrate = useCallback(() => {
    stateRef.current.calibratePoints = []
    setDraftCount(c => c + 1)
    redraw()
  }, [redraw])

  const getCalibratePxDistance = useCallback((): number | null => {
    const pts = stateRef.current.calibratePoints
    if (pts.length !== 2) return null
    return pixelDistance(pts[0], pts[1])
  }, [])

  // Re-run redraw whenever measurements change
  useEffect(() => { redraw() }, [measurements, redraw])

  return {
    canvasRef,
    bgCanvasRef,
    tool, setTool,
    measurements,
    draftCount,
    imageLoaded,
    loadImage,
    onWheel,
    onMouseDown, onMouseMove, onMouseUp, onMouseClick, onDoubleClickCanvas,
    onTouchStart, onTouchMove, onTouchEnd,
    undo, clearAll, clearCalibrate,
    getCalibratePxDistance,
    zoomIn: (cx: number, cy: number) => zoomAt(cx, cy, 1.3),
    zoomOut: (cx: number, cy: number) => zoomAt(cx, cy, 1 / 1.3),
    currentZoom: () => stateRef.current.zoom,
  }
}
