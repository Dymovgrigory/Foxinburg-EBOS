import { useEffect, useMemo, useRef } from 'react'

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

const streamUrl = (contentId: number) => `/api/v3/teacher-academy/contents/${contentId}/stream`

export default function AcademyContentViewer({ content, watermark }: AcademyContentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileExt = ext(content.title)
  const label = content.title || 'Материал'
  const src = streamUrl(content.id)

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
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const viewer = useMemo(() => {
    if (content.content_type === 'video' || fileExt.match(/^(mp4|webm|ogg|mov|mkv)$/)) {
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
          <source src={src} type="video/mp4" />
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
      )
    }

    if (content.content_type === 'pdf' || fileExt === 'pdf') {
      return (
        <iframe
          src={`${src}#toolbar=0&navpanes=0&scrollbar=0`}
          title={label}
          className="w-full h-[70vh] rounded-xl bg-white"
          sandbox="allow-same-origin allow-scripts"
        />
      )
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExt)) {
      return (
        <img
          src={src}
          alt={label}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="max-w-full max-h-[70vh] rounded-xl mx-auto object-contain"
        />
      )
    }

    // Office и прочие документы — открываем через защищённый поток
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-gray-50 rounded-xl text-center">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-xs text-gray-400">
          Файл открывается в защищённом просмотре. Скачивание и копирование ограничены.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 text-sm font-medium text-white bg-fox-purple rounded-lg hover:bg-fox-purple-light transition"
        >
          Открыть материал
        </a>
      </div>
    )
  }, [content.content_type, fileExt, label, src])

  return (
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
  )
}
