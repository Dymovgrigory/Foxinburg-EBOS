import { useEffect, useMemo, useRef, useState } from 'react'

export interface LessonContent {
  id: number
  content_type: string
  title?: string
  file_url?: string
  external_url?: string
}

interface AcademyContentViewerProps {
  content: LessonContent
  watermark?: string
}

const ext = (name = '') => {
  const parts = name.split('.')
  return parts[parts.length - 1]?.toLowerCase() || ''
}

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '')

const streamUrl = (contentId: number) => {
  const token = getToken()
  return `/api/v3/teacher-academy/contents/${contentId}/stream${token ? `?access_token=${encodeURIComponent(token)}` : ''}`
}
const pdfUrl = (contentId: number) => {
  const token = getToken()
  return `/api/v3/teacher-academy/contents/${contentId}/pdf${token ? `?access_token=${encodeURIComponent(token)}` : ''}`
}

const VIDEO_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
}

const videoMime = (fileExt: string) => VIDEO_TYPES[fileExt] || 'video/mp4'

export default function AcademyContentViewer({ content, watermark }: AcademyContentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fileExt = ext(content.title)
  const label = content.title || 'Материал'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ['p', 's', 'c', 'v', 'a'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault()
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault()
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isFullscreen])

  const isVideo = content.content_type === 'video' || fileExt.match(/^(mp4|webm|ogg|ogv|mov|mkv|avi)$/)
  const isPdf = content.content_type === 'pdf' || fileExt === 'pdf'
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExt)
  const isOffice = content.content_type === 'office' || ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt)

  const viewerUrl = useMemo(() => {
    if (isPdf || isImage || isVideo) return streamUrl(content.id)
    if (isOffice) return pdfUrl(content.id)
    return streamUrl(content.id)
  }, [isPdf, isImage, isVideo, isOffice, content.id])

  const viewer = useMemo(() => {
    if (isVideo) {
      return (
        <video
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className="w-full max-h-[70vh] rounded-xl bg-black"
          preload="metadata"
          playsInline
        >
          <source src={streamUrl(content.id)} type={videoMime(fileExt)} />
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
      )
    }

    if (isPdf) {
      return (
        <embed
          src={`${streamUrl(content.id)}#toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          title={label}
          className="w-full h-[70vh] rounded-xl bg-white"
        />
      )
    }

    if (isImage) {
      return (
        <img
          src={streamUrl(content.id)}
          alt={label}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="max-w-full max-h-[70vh] rounded-xl mx-auto object-contain"
        />
      )
    }

    // Office-документы — конвертируем в PDF для встроенного просмотра
    if (isOffice) {
      return (
        <embed
          src={`${pdfUrl(content.id)}#toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          title={label}
          className="w-full h-[70vh] rounded-xl bg-white"
        />
      )
    }

    // Прочие документы — открываем через защищённый поток
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-gray-50 rounded-xl text-center">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-xs text-gray-400">
          Файл открывается в защищённом просмотре. Скачивание и копирование ограничены.
        </p>
        <a
          href={streamUrl(content.id)}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 text-sm font-medium text-white bg-fox-purple rounded-lg hover:bg-fox-purple-light transition"
        >
          Открыть материал
        </a>
      </div>
    )
  }, [content.id, content.content_type, fileExt, label, isVideo, isPdf, isImage, isOffice])

  const fullscreenViewer = useMemo(() => {
    if (isVideo) {
      return (
        <video
          controls
          autoPlay
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full max-h-full rounded-xl bg-black object-contain"
          preload="metadata"
          playsInline
        >
          <source src={streamUrl(content.id)} type={videoMime(fileExt)} />
        </video>
      )
    }

    if (isPdf || isOffice) {
      return (
        <embed
          src={`${viewerUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          title={label}
          className="w-full h-full rounded-xl bg-white"
        />
      )
    }

    if (isImage) {
      return (
        <img
          src={viewerUrl}
          alt={label}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="max-w-full max-h-full rounded-xl object-contain"
        />
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-white text-center">
        <p className="text-lg">{label}</p>
        <a
          href={viewerUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 px-6 py-3 font-medium bg-fox-purple rounded-lg hover:bg-fox-purple-light transition"
        >
          Открыть материал
        </a>
      </div>
    )
  }, [content.id, viewerUrl, fileExt, label, isVideo, isPdf, isImage, isOffice])

  return (
    <>
      <div
        ref={containerRef}
        className="relative group rounded-xl overflow-hidden bg-black/5 select-none"
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onDrag={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {viewer}
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-3 py-1.5 text-xs font-medium text-white bg-fox-purple/80 hover:bg-fox-purple rounded-lg shadow"
          aria-label="Открыть на весь экран"
        >
          ⛶ Весь экран
        </button>
        {watermark && (
          <div
            className="absolute inset-0 pointer-events-none z-10 flex flex-wrap content-start justify-center gap-16 overflow-hidden opacity-[0.12] rotate-[-25deg] text-gray-900 font-bold text-xl whitespace-nowrap"
            aria-hidden="true"
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className="select-none">
                {watermark}
              </span>
            ))}
          </div>
        )}
      </div>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-20 px-3 py-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg"
          >
            ✕ Закрыть
          </button>
          <div
            className="relative w-[95vw] h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreenViewer}
            {watermark && (
              <div
                className="absolute inset-0 pointer-events-none z-10 flex flex-wrap content-start justify-center gap-24 overflow-hidden opacity-[0.08] rotate-[-25deg] text-white font-bold text-3xl whitespace-nowrap"
                aria-hidden="true"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <span key={i} className="select-none">
                    {watermark}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
