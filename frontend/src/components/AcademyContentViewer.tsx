import { useEffect, useMemo, useRef, useState } from 'react'
import { LuMaximize2, LuX } from 'react-icons/lu'
import { teacherAcademyApi } from '../api'
import PDFViewer from './PDFViewer'
import {
  blockContextMenu,
  setupAntiCopyListeners,
  setupKeyboardBlocker,
} from '../services/contentSecurity'

export interface LessonContent {
  id: number
  content_type: string
  title?: string
  stream_url?: string
  pdf_url?: string
}

interface AcademyContentViewerProps {
  content: LessonContent
  watermark?: string
}

const ext = (name = '') => {
  const parts = name.split('.')
  return parts[parts.length - 1]?.toLowerCase() || ''
}

export default function AcademyContentViewer({ content, watermark }: AcademyContentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [token, setToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [windowBlurred, setWindowBlurred] = useState(false)
  const label = content.title || 'Материал'

  useEffect(() => {
    let cancelled = false
    const fetchToken = async () => {
      try {
        const res = await teacherAcademyApi.getContentToken(content.id)
        if (!cancelled) setToken(res.token)
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Ошибка доступа к материалу'
          setTokenError(message)
        }
      }
    }
    fetchToken()
    return () => {
      cancelled = true
    }
  }, [content.id])

  useEffect(() => {
    const cleanupContainer = setupAntiCopyListeners(containerRef.current)
    const cleanupKeyboard = setupKeyboardBlocker()

    return () => {
      cleanupContainer()
      cleanupKeyboard()
    }
  }, [])

  useEffect(() => {
    const onBlur = () => setWindowBlurred(true)
    const onFocus = () => setWindowBlurred(false)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const streamUrlWithToken = useMemo(() => {
    if (!token) return ''
    return `${content.stream_url || `/api/v3/teacher-academy/contents/${content.id}/stream`}?content_token=${encodeURIComponent(token)}`
  }, [token, content.stream_url, content.id])

  const pdfUrlWithToken = useMemo(() => {
    if (!token) return ''
    return `${content.pdf_url || `/api/v3/teacher-academy/contents/${content.id}/pdf`}?content_token=${encodeURIComponent(token)}`
  }, [token, content.pdf_url, content.id])

  const viewer = useMemo(() => {
    const fileExt = ext(content.title)
    const isVideo =
      content.content_type === 'video' || /^(mp4|webm|ogg|ogv|mov|mkv|avi)$/.test(fileExt)
    const isPdf = content.content_type === 'pdf' || fileExt === 'pdf'
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExt)
    const isOffice =
      content.content_type === 'office' ||
      ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt)

    if (isVideo) {
      return (
        <video
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onContextMenu={blockContextMenu}
          className="w-full max-h-[70vh] rounded-xl bg-black"
          preload="metadata"
          playsInline
          src={streamUrlWithToken}
        >
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
      )
    }

    if (isPdf || isOffice) {
      return <PDFViewer url={isPdf ? streamUrlWithToken : pdfUrlWithToken} watermark={watermark} />
    }

    if (isImage) {
      return (
        <img
          src={streamUrlWithToken}
          alt={label}
          draggable={false}
          onContextMenu={blockContextMenu}
          className="max-w-full max-h-[70vh] rounded-xl mx-auto object-contain"
          style={{ userSelect: 'none' }}
        />
      )
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-fox-light/50 rounded-xl text-center">
        <p className="text-sm text-fox-gray">{label}</p>
        <p className="text-xs text-fox-gray/70">
          Файл доступен только для просмотра внутри платформы. Скачивание ограничено.
        </p>
      </div>
    )
  }, [content.content_type, content.title, label, streamUrlWithToken, pdfUrlWithToken, watermark])

  const fullscreenViewer = useMemo(() => {
    const fileExt = ext(content.title)
    const isVideo =
      content.content_type === 'video' || /^(mp4|webm|ogg|ogv|mov|mkv|avi)$/.test(fileExt)
    const isPdf = content.content_type === 'pdf' || fileExt === 'pdf'
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExt)
    const isOffice =
      content.content_type === 'office' ||
      ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt)

    if (isVideo) {
      return (
        <video
          controls
          autoPlay
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onContextMenu={blockContextMenu}
          className="w-full h-full max-h-full rounded-xl bg-black object-contain"
          preload="metadata"
          playsInline
          src={streamUrlWithToken}
        />
      )
    }

    if (isPdf || isOffice) {
      return <PDFViewer url={isPdf ? streamUrlWithToken : pdfUrlWithToken} watermark={watermark} />
    }

    if (isImage) {
      return (
        <img
          src={streamUrlWithToken}
          alt={label}
          draggable={false}
          onContextMenu={blockContextMenu}
          className="max-w-full max-h-full rounded-xl object-contain"
          style={{ userSelect: 'none' }}
        />
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-white text-center">
        <p className="text-lg">{label}</p>
      </div>
    )
  }, [content.content_type, content.title, label, streamUrlWithToken, pdfUrlWithToken, watermark])

  if (tokenError) {
    return (
      <div className="flex items-center justify-center h-[40vh] bg-fox-light/50 rounded-xl text-fox-gray">
        {tokenError}
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-[40vh] bg-fox-light/50 rounded-xl text-fox-gray">
        Загрузка защищённого материала…
      </div>
    )
  }

  const blocked = windowBlurred

  return (
    <>
      <div
        ref={containerRef}
        className="relative group rounded-xl overflow-hidden bg-black/5 select-none"
        onContextMenu={blockContextMenu}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        onDrag={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <div className={blocked ? 'blur-lg' : ''}>{viewer}</div>
        {watermark && !blocked && (
          <div
            className="absolute inset-0 pointer-events-none z-10 flex flex-wrap content-start justify-center gap-16 overflow-hidden opacity-[0.12] rotate-[-25deg] text-fox-purple font-bold text-xl whitespace-nowrap"
            aria-hidden="true"
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className="select-none">
                {watermark}
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity px-3 py-1.5 text-xs font-medium text-white bg-fox-purple/80 hover:bg-fox-purple rounded-lg shadow"
          aria-label="Открыть на весь экран"
        >
          <LuMaximize2 className="inline w-4 h-4 mr-1.5" /> Весь экран
        </button>
        {blocked && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white text-center p-6">
            <div>
              <p className="text-lg font-semibold mb-2">Вернутесь к окну</p>
              <p className="text-sm opacity-80">Для продолжения верните в это окно.</p>
            </div>
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
            <LuX className="inline w-4 h-4 mr-1.5" /> Закрыть
          </button>
          <div
            className="relative w-[95vw] h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={blocked ? 'blur-lg h-full' : 'h-full'}>{fullscreenViewer}</div>
            {watermark && !blocked && (
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
