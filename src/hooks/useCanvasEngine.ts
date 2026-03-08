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

const MIN_ZOOM = 0.2, MAX_ZOOM = 8, POINT_RADIUS = 6
const LINE_COLOR = '#e85d2a', AREA_FILL = 'rgba(74,124,89,0.18)'
const AREA_STROKE = '#4a7c59', CALIBRATE_COLOR = '#c0522a', DRAFT_COLOR = '#e85d2a'

export function useCanvasEngine(scale: ScaleConfig | null) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef    = useRef<CanvasState>({ offsetX:0, offsetY:0, zoom:1, draftPoints:[], calibratePoints:[] })

  const [tool, setTool]             = useState<Tool>('pan')
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [draftCount, setDraftCount] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)

  const isPanning      = useRef(false)
  const lastPointer    = useRef<Point>({ x:0, y:0 })
  const lastPinchDist  = useRef<number|null>(null)

  // ── Load image ──────────────────────────────────────────────────
  const loadImage = useCallback((dataUrl: string, imgW: number, imgH: number) => {
    const bgCanvas = bgCanvasRef.current, canvas = canvasRef.current
    if (!bgCanvas || !canvas) return
    bgCanvas.width = imgW; bgCanvas.height = imgH
    canvas.width   = imgW; canvas.height   = imgH
    const ctx = bgCanvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const container = canvas.parentElement
      if (container) {
        const z = Math.min(container.clientWidth/imgW, container.clientHeight/imgH, 1)
        stateRef.current.zoom    = z
        stateRef.current.offsetX = (container.clientWidth  - imgW*z) / 2
        stateRef.current.offsetY = (container.clientHeight - imgH*z) / 2
      }
      setImageLoaded(true)
      redraw()
    }
    img.src = dataUrl
  }, []) // eslint-disable-line

  // ── Redraw ──────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current, bgCanvas = bgCanvasRef.current
    if (!canvas || !bgCanvas) return
    const ctx = canvas.getContext('2d')!
    const { offsetX, offsetY, zoom, draftPoints, calibratePoints } = stateRef.current
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(offsetX, offsetY)
    ctx.scale(zoom, zoom)
    ctx.drawImage(bgCanvas, 0, 0)

    measurements.forEach(m => {
      if (m.type === 'distance') drawLine(ctx, m.points[0], m.points[1], LINE_COLOR, zoom)
      else drawPolygon(ctx, m.points, AREA_STROKE, AREA_FILL, zoom, true)
    })

    if (draftPoints.length > 0) {
      if (tool === 'distance') drawDot(ctx, draftPoints[0], DRAFT_COLOR, zoom)
      else if (tool === 'area') {
        drawPolygon(ctx, draftPoints, AREA_STROKE, 'transparent', zoom, false)
        draftPoints.forEach(p => drawDot(ctx, p, AREA_STROKE, zoom))
      }
    }

    if (calibratePoints.length === 1) drawDot(ctx, calibratePoints[0], CALIBRATE_COLOR, zoom)
    else if (calibratePoints.length === 2) drawLine(ctx, calibratePoints[0], calibratePoints[1], CALIBRATE_COLOR, zoom)

    ctx.restore()
  }, [measurements, tool])

  function drawDot(ctx: CanvasRenderingContext2D, p: Point, color: string, zoom: number) {
    const r = POINT_RADIUS / zoom
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2)
    ctx.fillStyle = color; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5/zoom; ctx.stroke()
  }
  function drawLine(ctx: CanvasRenderingContext2D, a: Point, b: Point, color: string, zoom: number) {
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y)
    ctx.strokeStyle = color; ctx.lineWidth = 2/zoom
    ctx.setLineDash([8/zoom,4/zoom]); ctx.stroke(); ctx.setLineDash([])
    drawDot(ctx, a, color, zoom); drawDot(ctx, b, color, zoom)
  }
  function drawPolygon(ctx: CanvasRenderingContext2D, pts: Point[], stroke: string, fill: string, zoom: number, closed: boolean) {
    if (pts.length < 2) return
    ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y)
    pts.slice(1).forEach(p => ctx.lineTo(p.x,p.y))
    if (closed) ctx.closePath()
    ctx.strokeStyle = stroke; ctx.lineWidth = 2/zoom; ctx.stroke()
    if (closed && pts.length >= 3 && fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill() }
  }

  // ── Screen → canvas coords ──────────────────────────────────────
  const screenToCanvas = useCallback((sx: number, sy: number): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const { offsetX, offsetY, zoom } = stateRef.current
    return { x: (sx-rect.left-offsetX)/zoom, y: (sy-rect.top-offsetY)/zoom }
  }, [])

  // ── Click ───────────────────────────────────────────────────────
  const handleClick = useCallback((sx: number, sy: number) => {
    if (!imageLoaded || tool === 'pan') return
    const pt = screenToCanvas(sx, sy)
    const s = stateRef.current

    if (tool === 'calibrate') {
      if (s.calibratePoints.length < 2) { s.calibratePoints = [...s.calibratePoints, pt]; setDraftCount(c=>c+1); redraw() }
      return
    }
    if (tool === 'distance') {
      s.draftPoints = [...s.draftPoints, pt]
      if (s.draftPoints.length === 2) {
        const [a,b] = s.draftPoints as [Point,Point]
        const pxDist = pixelDistance(a,b)
        setMeasurements(prev => [...prev, { id:crypto.randomUUID(), type:'distance', points:[a,b], pixelDist:pxDist, realFeet: scale ? pixelsToFeet(pxDist,scale) : 0 }])
        s.draftPoints = []
      }
      setDraftCount(c=>c+1); redraw(); return
    }
    if (tool === 'area') { s.draftPoints = [...s.draftPoints, pt]; setDraftCount(c=>c+1); redraw() }
  }, [tool, imageLoaded, scale, screenToCanvas, redraw])

  // ── Double-click closes area ────────────────────────────────────
  const handleDoubleClick = useCallback((_sx: number, _sy: number) => {
    if (tool !== 'area') return
    const s = stateRef.current
    if (s.draftPoints.length < 3) return
    const pts = s.draftPoints
    const pxArea = polygonPixelArea(pts)
    setMeasurements(prev => [...prev, { id:crypto.randomUUID(), type:'area', points:pts, pixelArea:pxArea, realSqFt: scale ? pixelAreaToSqFt(pxArea,scale) : 0 }])
    s.draftPoints = []; setDraftCount(c=>c+1); redraw()
  }, [tool, scale, redraw])

  // ── Pan & zoom ──────────────────────────────────────────────────
  const startPan = useCallback((x:number,y:number) => { isPanning.current=true; lastPointer.current={x,y} },[])
  const movePan  = useCallback((x:number,y:number) => {
    if (!isPanning.current) return
    stateRef.current.offsetX += x-lastPointer.current.x
    stateRef.current.offsetY += y-lastPointer.current.y
    lastPointer.current={x,y}; redraw()
  },[redraw])
  const endPan = useCallback(()=>{ isPanning.current=false },[])

  const zoomAt = useCallback((cx:number,cy:number,factor:number) => {
    const s=stateRef.current, canvas=canvasRef.current!
    const rect=canvas.getBoundingClientRect()
    const mx=cx-rect.left, my=cy-rect.top
    const nz=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,s.zoom*factor))
    const r=nz/s.zoom
    s.offsetX=mx-r*(mx-s.offsetX); s.offsetY=my-r*(my-s.offsetY); s.zoom=nz; redraw()
  },[redraw])

  // ── Canvas event handlers ───────────────────────────────────────
  const onWheel = useCallback((e:React.WheelEvent<HTMLCanvasElement>) => { e.preventDefault(); zoomAt(e.clientX,e.clientY,e.deltaY<0?1.12:1/1.12) },[zoomAt])
  const onMouseDown  = useCallback((e:React.MouseEvent<HTMLCanvasElement>) => { if(tool==='pan') startPan(e.clientX,e.clientY) },[tool,startPan])
  const onMouseMove  = useCallback((e:React.MouseEvent<HTMLCanvasElement>) => { if(tool==='pan') movePan(e.clientX,e.clientY) },[tool,movePan])
  const onMouseUp    = useCallback(()=>endPan(),[endPan])
  const onMouseClick = useCallback((e:React.MouseEvent<HTMLCanvasElement>) => { if(tool!=='pan') handleClick(e.clientX,e.clientY) },[tool,handleClick])
  const onDoubleClickCanvas = useCallback((e:React.MouseEvent<HTMLCanvasElement>) => { handleDoubleClick(e.clientX,e.clientY) },[handleDoubleClick])

  const onTouchStart = useCallback((e:React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length===2) { const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY; lastPinchDist.current=Math.sqrt(dx*dx+dy*dy); return }
    if (tool==='pan') startPan(e.touches[0].clientX,e.touches[0].clientY)
  },[tool,startPan])

  const onTouchMove = useCallback((e:React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length===2 && lastPinchDist.current!==null) {
      const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY
      const dist=Math.sqrt(dx*dx+dy*dy)
      zoomAt((e.touches[0].clientX+e.touches[1].clientX)/2,(e.touches[0].clientY+e.touches[1].clientY)/2,dist/lastPinchDist.current)
      lastPinchDist.current=dist; return
    }
    if (tool==='pan') movePan(e.touches[0].clientX,e.touches[0].clientY)
  },[tool,movePan,zoomAt])

  const onTouchEnd = useCallback((e:React.TouchEvent<HTMLCanvasElement>) => {
    lastPinchDist.current=null; endPan()
    if (e.changedTouches.length===1 && tool!=='pan') handleClick(e.changedTouches[0].clientX,e.changedTouches[0].clientY)
  },[tool,endPan,handleClick])

  // ── Undo / clear / remove ───────────────────────────────────────
  const undo = useCallback(()=>{
    const s=stateRef.current
    if (s.draftPoints.length>0) { s.draftPoints=s.draftPoints.slice(0,-1); setDraftCount(c=>c+1) }
    else setMeasurements(prev=>prev.slice(0,-1))
    redraw()
  },[redraw])

  const clearAll = useCallback(()=>{
    stateRef.current.draftPoints=[]; stateRef.current.calibratePoints=[]
    setMeasurements([]); setDraftCount(0); redraw()
  },[redraw])

  const clearCalibrate = useCallback(()=>{
    stateRef.current.calibratePoints=[]; setDraftCount(c=>c+1); redraw()
  },[redraw])

  const removeById = useCallback((id:string)=>{
    setMeasurements(prev=>prev.filter(m=>m.id!==id))
  },[])

  const getCalibratePxDistance = useCallback(():number|null=>{
    const pts=stateRef.current.calibratePoints
    return pts.length===2 ? pixelDistance(pts[0],pts[1]) : null
  },[])

  useEffect(()=>{ redraw() },[measurements,redraw])

  return {
    canvasRef, bgCanvasRef,
    tool, setTool,
    measurements, draftCount, imageLoaded,
    loadImage,
    onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseClick, onDoubleClickCanvas,
    onTouchStart, onTouchMove, onTouchEnd,
    undo, clearAll, clearCalibrate, removeById,
    getCalibratePxDistance,
    zoomIn:  (cx:number,cy:number)=>zoomAt(cx,cy,1.3),
    zoomOut: (cx:number,cy:number)=>zoomAt(cx,cy,1/1.3),
    currentZoom: ()=>stateRef.current.zoom,
  }
}
