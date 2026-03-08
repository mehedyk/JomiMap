import { useState, useCallback, useRef } from 'react'

export interface PDFState {
  type: 'pdf' | 'image' | null
  totalPages: number
  currentPage: number
  fileName: string
  fileSize: number
}

export type LoadStage = 'idle' | 'reading' | 'parsing' | 'rendering' | 'done' | 'error'

const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs'
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'

let pdfjsLib: typeof import('pdfjs-dist') | null = null

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib
  // @ts-ignore
  const lib = await import(/* @vite-ignore */ PDFJS_CDN)
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
  pdfjsLib = lib
  return lib
}

export function usePDFLoader() {
  const [pdfState, setPdfState] = useState<PDFState>({
    type: null, totalPages: 0, currentPage: 1, fileName: '', fileSize: 0,
  })
  const [loading, setLoading]   = useState(false)
  const [stage, setStage]       = useState<LoadStage>('idle')
  const [error, setError]       = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef    = useRef<any>(null)
  const imageUrlRef  = useRef<string | null>(null)

  const loadFile = useCallback(async (
    file: File,
    onPageRendered: (dataUrl: string, w: number, h: number) => void
  ) => {
    setLoading(true)
    setError(null)
    setStage('reading')

    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current)
      imageUrlRef.current = null
    }

    try {
      if (file.type === 'application/pdf') {
        setStage('parsing')
        const lib = await getPdfJs()
        const arrayBuffer = await file.arrayBuffer()

        const pdf = await lib.getDocument({ data: arrayBuffer }).promise
        pdfDocRef.current = pdf

        setPdfState({
          type: 'pdf', totalPages: pdf.numPages,
          currentPage: 1, fileName: file.name, fileSize: file.size,
        })

        setStage('rendering')
        await renderPDFPage(pdf, 1, onPageRendered)

      } else {
        // Image
        setStage('rendering')
        const url = URL.createObjectURL(file)
        imageUrlRef.current = url

        await new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => {
            // Use createImageBitmap + OffscreenCanvas if available to avoid main-thread freeze
            const w = img.naturalWidth, h = img.naturalHeight

            if (typeof OffscreenCanvas !== 'undefined') {
              const oc = new OffscreenCanvas(w, h)
              const ctx = oc.getContext('2d')!
              ctx.drawImage(img, 0, 0)
              oc.convertToBlob({ type: 'image/png' }).then(blob => {
                const reader = new FileReader()
                reader.onload = () => {
                  onPageRendered(reader.result as string, w, h)
                  resolve()
                }
                reader.readAsDataURL(blob)
              }).catch(reject)
            } else {
              // Fallback: regular canvas
              const canvas = document.createElement('canvas')
              canvas.width = w; canvas.height = h
              const ctx = canvas.getContext('2d')!
              ctx.drawImage(img, 0, 0)
              onPageRendered(canvas.toDataURL('image/png'), w, h)
              resolve()
            }
          }
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = url
        })

        setPdfState({
          type: 'image', totalPages: 1, currentPage: 1,
          fileName: file.name, fileSize: file.size,
        })
      }

      setStage('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load file'
      setError(msg)
      setStage('error')
    } finally {
      setLoading(false)
    }
  }, [])

  const goToPage = useCallback(async (
    page: number,
    onPageRendered: (dataUrl: string, w: number, h: number) => void
  ) => {
    if (!pdfDocRef.current || pdfState.type !== 'pdf') return
    if (page < 1 || page > pdfState.totalPages) return
    setLoading(true)
    setStage('rendering')
    try {
      await renderPDFPage(pdfDocRef.current, page, onPageRendered)
      setPdfState(prev => ({ ...prev, currentPage: page }))
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render page')
      setStage('error')
    } finally {
      setLoading(false)
    }
  }, [pdfState.type, pdfState.totalPages])

  return { pdfState, loading, stage, error, loadFile, goToPage }
}

async function renderPDFPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  pageNum: number,
  onPageRendered: (dataUrl: string, w: number, h: number) => void
) {
  const page = await pdf.getPage(pageNum)

  // 2× gives good quality without the memory cost of 2.5×
  // For very large maps this matters a lot for the toDataURL freeze
  const RENDER_SCALE = 2
  const viewport = page.getViewport({ scale: RENDER_SCALE })

  if (typeof OffscreenCanvas !== 'undefined') {
    // Render on OffscreenCanvas — doesn't block the main thread
    const oc = new OffscreenCanvas(viewport.width, viewport.height)
    // @ts-ignore — PDF.js accepts OffscreenCanvas context
    const ctx = oc.getContext('2d')
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await oc.convertToBlob({ type: 'image/png' })
    const dataUrl = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    onPageRendered(dataUrl, viewport.width, viewport.height)
  } else {
    // Fallback: regular canvas on main thread
    const canvas = document.createElement('canvas')
    canvas.width  = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    onPageRendered(canvas.toDataURL('image/png'), viewport.width, viewport.height)
  }
}
