import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

interface PDFViewerProps {
  url: string
  watermark?: string
}

export default function PDFViewer({ url, watermark }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1.2)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(url, { credentials: 'same-origin' })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`)
        }
        const data = await res.arrayBuffer()
        if (cancelled) return
        const loadingTask = pdfjsLib.getDocument({ data })
        const doc = await loadingTask.promise
        if (cancelled) return
        setPdf(doc)
        setNumPages(doc.numPages)
        setPageNum(1)
      } catch (err) {
        console.error('[PDFViewer] failed to load PDF', err)
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить PDF')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    const render = async () => {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvas, viewport }).promise
    }
    render()
  }, [pdf, pageNum, scale])

  if (error) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-gray-50 rounded-xl text-gray-600">
        {error}
      </div>
    )
  }

  return (
    <div className="relative h-[70vh] bg-gray-100 rounded-xl overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div className="relative shadow-lg">
          <canvas
            ref={canvasRef}
            onContextMenu={(e) => e.preventDefault()}
            className="bg-white"
            style={{ userSelect: 'none' }}
          />
          {watermark && (
            <div
              className="absolute inset-0 pointer-events-none z-10 flex flex-wrap content-start justify-center gap-12 overflow-hidden opacity-[0.12] rotate-[-25deg] text-gray-900 font-bold text-lg whitespace-nowrap"
              aria-hidden="true"
            >
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={i} className="select-none">
                  {watermark}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {numPages > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 text-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageNum <= 1}
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            >
              ←
            </button>
            <span className="text-gray-600">
              {pageNum} / {numPages}
            </span>
            <button
              type="button"
              disabled={pageNum >= numPages}
              onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              −
            </button>
            <span className="text-gray-600">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3, s + 0.2))}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
