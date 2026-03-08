import { useState, useCallback, useRef } from 'react'

export interface PDFState {
  type: 'pdf' | 'image' | null
  totalPages: number
  currentPage: number
  fileName: string
  fileSize: number
}

// We load PDF.js from CDN to avoid bundling issues with workers
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs'
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'

let pdfjsLib: typeof import('pdfjs-dist') | null = null

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib
  // @ts-ignore — dynamic CDN import
  const lib = await import(/* @vite-ignore */ PDFJS_CDN)
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
  pdfjsLib = lib
  return lib
}

export function usePDFLoader() {
  const [pdfState, setPdfState] = useState<PDFState>({
    type: null,
    totalPages: 0,
    currentPage: 1,
    fileName: '',
    fileSize: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null)
  const imageUrlRef = useRef<string | null>(null)

  const loadFile = useCallback(async (
    file: File,
    onPageRendered: (dataUrl: string, width: number, height: number) => void
  ) => {
    setLoading(true)
    setError(null)

    // Revoke old image URL
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current)
      imageUrlRef.current = null
    }

    try {
      if (file.type === 'application/pdf') {
        const lib = await getPdfJs()
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise
        pdfDocRef.current = pdf

        setPdfState({
          type: 'pdf',
          totalPages: pdf.numPages,
          currentPage: 1,
          fileName: file.name,
          fileSize: file.size,
        })

        await renderPDFPage(pdf, 1, onPageRendered)
      } else {
        // Image file
        const url = URL.createObjectURL(file)
        imageUrlRef.current = url

        await new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)
            const dataUrl = canvas.toDataURL('image/png')
            onPageRendered(dataUrl, img.naturalWidth, img.naturalHeight)
            resolve()
          }
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = url
        })

        setPdfState({
          type: 'image',
          totalPages: 1,
          currentPage: 1,
          fileName: file.name,
          fileSize: file.size,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
    } finally {
      setLoading(false)
    }
  }, [])

  const goToPage = useCallback(async (
    page: number,
    onPageRendered: (dataUrl: string, width: number, height: number) => void
  ) => {
    if (!pdfDocRef.current || pdfState.type !== 'pdf') return
    if (page < 1 || page > pdfState.totalPages) return

    setLoading(true)
    try {
      await renderPDFPage(pdfDocRef.current, page, onPageRendered)
      setPdfState(prev => ({ ...prev, currentPage: page }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render page')
    } finally {
      setLoading(false)
    }
  }, [pdfState.type, pdfState.totalPages])

  return { pdfState, loading, error, loadFile, goToPage }
}

async function renderPDFPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  pageNum: number,
  onPageRendered: (dataUrl: string, width: number, height: number) => void
) {
  const page = await pdf.getPage(pageNum)

  // High quality: scale 2x for retina / high-res maps
  const scale = 2.5
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise

  const dataUrl = canvas.toDataURL('image/png')
  onPageRendered(dataUrl, viewport.width, viewport.height)
}
