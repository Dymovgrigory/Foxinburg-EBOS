import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs?v=2'

type DestroyableDoc = pdfjsLib.PDFDocumentProxy & { destroy: () => Promise<void> }

interface PDFViewerProps {
  url: string
  watermark?: string
}

interface PageItem {
  page: pdfjsLib.PDFPageProxy
  viewport: pdfjsLib.PageViewport
}

function PageCanvas({
  page,
  scale,
  watermark,
}: {
  page: pdfjsLib.PDFPageProxy
  scale: number
  watermark?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewport, setViewport] = useState<pdfjsLib.PageViewport | null>(null)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      const vp = page.getViewport({ scale })
      setViewport(vp)
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = vp.width
      canvas.height = vp.height
      try {
        await page.render({ canvas, viewport: vp }).promise
      } catch (err) {
        if (!cancelled) console.error('[PDFViewer] render page error', err)
      }
    }
    render()
    return () => {
      cancelled = true
    }
  }, [page, scale])

  return (
    <div
      className="relative shadow-lg bg-white mx-auto mb-4"
      style={
        viewport
          ? { width: viewport.width, height: viewport.height }
          : undefined
      }
    >
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => e.preventDefault()}
        className="bg-white block"
        style={{ userSelect: 'none' }}
      />
      {watermark && viewport && (
        <div
          className="absolute inset-0 pointer-events-none z-10 flex flex-wrap content-start justify-center gap-12 overflow-hidden opacity-[0.12] rotate-[-25deg] text-fox-purple font-bold text-lg whitespace-nowrap"
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
  )
}

export default function PDFViewer({ url, watermark }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pages, setPages] = useState<PageItem[]>([])
  const [scale, setScale] = useState(1)
  const [error, setError] = useState<string | null>(null)

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
        if (cancelled) {
          ;(doc as unknown as DestroyableDoc).destroy().catch(() => {})
          return
        }
        setPdf(doc)

        const loadedPages: PageItem[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i)
          const viewport = page.getViewport({ scale: 1 })
          loadedPages.push({ page, viewport })
        }
        if (cancelled) return
        setPages(loadedPages)

        const containerWidth = containerRef.current?.clientWidth ?? 0
        if (containerWidth > 0 && loadedPages.length > 0) {
          const pad = 32
          const fit = (containerWidth - pad) / loadedPages[0].viewport.width
          setScale(Math.max(0.5, Math.min(3, fit)))
        } else {
          setScale(1)
        }
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
      ;(pdf as unknown as DestroyableDoc | null)?.destroy().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  if (error) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-fox-light/50 rounded-xl text-fox-gray">
        {error}
      </div>
    )
  }

  if (!pdf || pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-fox-light/50 rounded-xl text-fox-gray">
        Загрузка документа…
      </div>
    )
  }

  return (
    <div className="relative h-[70vh] bg-fox-light rounded-xl overflow-hidden flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-auto p-4">
        {pages.map(({ page }, index) => (
          <PageCanvas key={index} page={page} scale={scale} watermark={watermark} />
        ))}
      </div>
      <div className="flex items-center justify-end px-4 py-2 bg-white border-t border-fox-border text-sm gap-2">
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
          className="px-3 py-1 rounded-lg bg-fox-light hover:bg-fox-light"
        >
          −
        </button>
        <span className="text-fox-gray min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(3, s + 0.2))}
          className="px-3 py-1 rounded-lg bg-fox-light hover:bg-fox-light"
        >
          +
        </button>
      </div>
    </div>
  )
}
