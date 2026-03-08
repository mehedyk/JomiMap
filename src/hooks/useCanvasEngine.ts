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

const MIN_ZOOM = 0.1, MAX_ZOOM = 10, PR = 6
const LC = '#e85d2a', AF = 'rgba(74,124,89,0.18)', AS = '#4a7c59', CC = '#c0522a'

export function useCanvasEngine(
  scale: ScaleConfig | null,
  onZoomChange?: (pct: number) => void
) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const bgCanvasRef = useRef<HTMLCanvasElement>(null)
  const st          = useRef<CanvasState>({ offsetX:0, offsetY:0, zoom:1, draftPoints:[], calibratePoints:[] })

  const [tool, setTool]                     = useState<Tool>('pan')
  const [measurements, setMeasurements]     = useState<Measurement[]>([])
  const [draftCount, setDraftCount]         = useState(0)
  const [imageLoaded, setImageLoaded]       = useState(false)

  const panning   = useRef(false)
  const lastPtr   = useRef<Point>({ x:0, y:0 })
  const pinchDist = useRef<number|null>(null)

  // ── Load image ───────────────────────────────────────────────────
  const loadImage = useCallback((dataUrl: string, imgW: number, imgH: number) => {
    const bg = bgCanvasRef.current, cv = canvasRef.current; if (!bg||!cv) return
    bg.width=imgW; bg.height=imgH; cv.width=imgW; cv.height=imgH
    const ctx = bg.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      const cont = cv.parentElement
      if (cont) {
        const z = Math.min(cont.clientWidth/imgW, cont.clientHeight/imgH, 1)
        st.current.zoom    = z
        st.current.offsetX = (cont.clientWidth  - imgW*z)/2
        st.current.offsetY = (cont.clientHeight - imgH*z)/2
        onZoomChange?.(Math.round(z*100))
      }
      setImageLoaded(true); redraw()
    }
    img.src = dataUrl
  }, []) // eslint-disable-line

  // ── Redraw ───────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const cv=canvasRef.current, bg=bgCanvasRef.current; if (!cv||!bg) return
    const ctx=cv.getContext('2d')!
    const {offsetX,offsetY,zoom,draftPoints,calibratePoints}=st.current
    ctx.clearRect(0,0,cv.width,cv.height)
    ctx.save(); ctx.translate(offsetX,offsetY); ctx.scale(zoom,zoom)
    ctx.drawImage(bg,0,0)

    measurements.forEach(m=>{
      if (m.type==='distance') line(ctx,m.points[0],m.points[1],LC,zoom)
      else poly(ctx,m.points,AS,AF,zoom,true)
    })
    if (draftPoints.length>0) {
      if (tool==='distance') dot(ctx,draftPoints[0],LC,zoom)
      else if (tool==='area') { poly(ctx,draftPoints,AS,'transparent',zoom,false); draftPoints.forEach(p=>dot(ctx,p,AS,zoom)) }
    }
    if (calibratePoints.length===1) dot(ctx,calibratePoints[0],CC,zoom)
    else if (calibratePoints.length===2) line(ctx,calibratePoints[0],calibratePoints[1],CC,zoom)
    ctx.restore()
  },[measurements,tool])

  function dot(ctx:CanvasRenderingContext2D,p:Point,c:string,z:number){
    const r=PR/z; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2)
    ctx.fillStyle=c; ctx.fill(); ctx.strokeStyle='white'; ctx.lineWidth=1.5/z; ctx.stroke()
  }
  function line(ctx:CanvasRenderingContext2D,a:Point,b:Point,c:string,z:number){
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y)
    ctx.strokeStyle=c; ctx.lineWidth=2/z; ctx.setLineDash([8/z,4/z]); ctx.stroke(); ctx.setLineDash([])
    dot(ctx,a,c,z); dot(ctx,b,c,z)
  }
  function poly(ctx:CanvasRenderingContext2D,pts:Point[],stroke:string,fill:string,z:number,closed:boolean){
    if(pts.length<2) return
    ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y))
    if(closed) ctx.closePath()
    ctx.strokeStyle=stroke; ctx.lineWidth=2/z; ctx.stroke()
    if(closed&&pts.length>=3&&fill!=='transparent'){ctx.fillStyle=fill;ctx.fill()}
  }

  // ── Coords ───────────────────────────────────────────────────────
  const s2c = useCallback((sx:number,sy:number):Point=>{
    const r=canvasRef.current!.getBoundingClientRect()
    const {offsetX,offsetY,zoom}=st.current
    return {x:(sx-r.left-offsetX)/zoom,y:(sy-r.top-offsetY)/zoom}
  },[])

  // ── Click ────────────────────────────────────────────────────────
  const handleClick=useCallback((sx:number,sy:number)=>{
    if(!imageLoaded||tool==='pan') return
    const pt=s2c(sx,sy); const s=st.current
    if(tool==='calibrate'){
      if(s.calibratePoints.length<2){s.calibratePoints=[...s.calibratePoints,pt];setDraftCount(c=>c+1);redraw()}
      return
    }
    if(tool==='distance'){
      s.draftPoints=[...s.draftPoints,pt]
      if(s.draftPoints.length===2){
        const[a,b]=s.draftPoints as[Point,Point]; const pd=pixelDistance(a,b)
        setMeasurements(prev=>[...prev,{id:crypto.randomUUID(),type:'distance',points:[a,b],pixelDist:pd,realFeet:scale?pixelsToFeet(pd,scale):0}])
        s.draftPoints=[]
      }
      setDraftCount(c=>c+1); redraw(); return
    }
    if(tool==='area'){s.draftPoints=[...s.draftPoints,pt];setDraftCount(c=>c+1);redraw()}
  },[tool,imageLoaded,scale,s2c,redraw])

  // ── Double-click closes area ─────────────────────────────────────
  const handleDbl=useCallback((_sx:number,_sy:number)=>{
    if(tool!=='area') return
    const s=st.current; if(s.draftPoints.length<3) return
    const pts=s.draftPoints; const pa=polygonPixelArea(pts)
    setMeasurements(prev=>[...prev,{id:crypto.randomUUID(),type:'area',points:pts,pixelArea:pa,realSqFt:scale?pixelAreaToSqFt(pa,scale):0}])
    s.draftPoints=[];setDraftCount(c=>c+1);redraw()
  },[tool,scale,redraw])

  // ── Pan ──────────────────────────────────────────────────────────
  const startPan=useCallback((x:number,y:number)=>{panning.current=true;lastPtr.current={x,y}},[])
  const movePan =useCallback((x:number,y:number)=>{
    if(!panning.current) return
    st.current.offsetX+=x-lastPtr.current.x; st.current.offsetY+=y-lastPtr.current.y
    lastPtr.current={x,y}; redraw()
  },[redraw])
  const endPan=useCallback(()=>{panning.current=false},[])

  // ── Zoom ─────────────────────────────────────────────────────────
  const zoomAt=useCallback((cx:number,cy:number,factor:number)=>{
    const s=st.current; const r=canvasRef.current!.getBoundingClientRect()
    const mx=cx-r.left, my=cy-r.top
    const nz=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,s.zoom*factor))
    const ratio=nz/s.zoom
    s.offsetX=mx-ratio*(mx-s.offsetX); s.offsetY=my-ratio*(my-s.offsetY); s.zoom=nz
    onZoomChange?.(Math.round(nz*100))
    redraw()
  },[redraw,onZoomChange])

  // ── Event handlers ───────────────────────────────────────────────
  const onWheel=useCallback((e:React.WheelEvent<HTMLCanvasElement>)=>{e.preventDefault();zoomAt(e.clientX,e.clientY,e.deltaY<0?1.12:1/1.12)},[zoomAt])
  const onMouseDown =useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{if(tool==='pan')startPan(e.clientX,e.clientY)},[tool,startPan])
  const onMouseMove =useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{if(tool==='pan')movePan(e.clientX,e.clientY)},[tool,movePan])
  const onMouseUp   =useCallback(()=>endPan(),[endPan])
  const onMouseClick=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{if(tool!=='pan')handleClick(e.clientX,e.clientY)},[tool,handleClick])
  const onDoubleClickCanvas=useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{handleDbl(e.clientX,e.clientY)},[handleDbl])

  const onTouchStart=useCallback((e:React.TouchEvent<HTMLCanvasElement>)=>{
    if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;pinchDist.current=Math.sqrt(dx*dx+dy*dy);return}
    if(tool==='pan')startPan(e.touches[0].clientX,e.touches[0].clientY)
  },[tool,startPan])
  const onTouchMove=useCallback((e:React.TouchEvent<HTMLCanvasElement>)=>{
    e.preventDefault()
    if(e.touches.length===2&&pinchDist.current!==null){
      const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY
      const d=Math.sqrt(dx*dx+dy*dy)
      zoomAt((e.touches[0].clientX+e.touches[1].clientX)/2,(e.touches[0].clientY+e.touches[1].clientY)/2,d/pinchDist.current)
      pinchDist.current=d; return
    }
    if(tool==='pan')movePan(e.touches[0].clientX,e.touches[0].clientY)
  },[tool,movePan,zoomAt])
  const onTouchEnd=useCallback((e:React.TouchEvent<HTMLCanvasElement>)=>{
    pinchDist.current=null; endPan()
    if(e.changedTouches.length===1&&tool!=='pan')handleClick(e.changedTouches[0].clientX,e.changedTouches[0].clientY)
  },[tool,endPan,handleClick])

  // ── Undo / clear / remove ────────────────────────────────────────
  const undo=useCallback(()=>{
    const s=st.current
    if(s.draftPoints.length>0){s.draftPoints=s.draftPoints.slice(0,-1);setDraftCount(c=>c+1)}
    else setMeasurements(p=>p.slice(0,-1))
    redraw()
  },[redraw])
  const clearAll=useCallback(()=>{st.current.draftPoints=[];st.current.calibratePoints=[];setMeasurements([]);setDraftCount(0);redraw()},[redraw])
  const clearCalibrate=useCallback(()=>{st.current.calibratePoints=[];setDraftCount(c=>c+1);redraw()},[redraw])
  const removeById=useCallback((id:string)=>{setMeasurements(p=>p.filter(m=>m.id!==id))},[])
  const getCalibratePxDistance=useCallback(():number|null=>{
    const pts=st.current.calibratePoints; return pts.length===2?pixelDistance(pts[0],pts[1]):null
  },[])

  useEffect(()=>{redraw()},[measurements,redraw])

  return {
    canvasRef, bgCanvasRef,
    tool, setTool, measurements, draftCount, imageLoaded, loadImage,
    onWheel, onMouseDown, onMouseMove, onMouseUp, onMouseClick, onDoubleClickCanvas,
    onTouchStart, onTouchMove, onTouchEnd,
    undo, clearAll, clearCalibrate, removeById, getCalibratePxDistance,
    zoomIn: (cx:number,cy:number)=>zoomAt(cx,cy,1.3),
    zoomOut:(cx:number,cy:number)=>zoomAt(cx,cy,1/1.3),
    currentZoom:()=>st.current.zoom,
  }
}
