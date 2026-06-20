import { useMemo } from 'react'

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

const officeUrl = (fileUrl: string) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`

const googleDocUrl = (fileUrl: string) =>
  `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(fileUrl)}`

export default function AcademyContentViewer({ content, watermark }: AcademyContentViewerProps) {
  const fileUrl = content.file_url
  const fileExt = ext(content.title)
  const label = content.title || 'Материал'

  const viewer = useMemo(() => {
    if (!fileUrl) {
      return <p className="text-sm text-gray-500">Ссылка на материал отсутствует</p>
    }

    if (content.content_type === 'video') {
      return (
        <video
          controls
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className="w-full max-h-[70vh] rounded-xl bg-black"
          preload="metadata"
        >
          <source src={fileUrl} />
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
      )
    }

    if (content.content_type === 'pdf' || fileExt === 'pdf') {
      return (
        <iframe
          src={`${fileUrl}#toolbar=0&navpanes=0`}
          title={label}
          className="w-full h-[70vh] rounded-xl bg-white"
        />
      )
    }

    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExt)) {
      return (
        <iframe
          src={officeUrl(fileUrl)}
          title={label}
          className="w-full h-[70vh] rounded-xl bg-white"
        />
      )
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt)) {
      return (
        <img
          src={fileUrl}
          alt={label}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="max-w-full max-h-[70vh] rounded-xl mx-auto object-contain"
        />
      )
    }

    // Fallback: пробуем Google Docs viewer для прочих документов
    if (['txt', 'rtf', 'odt', 'ods', 'odp'].includes(fileExt)) {
      return (
        <iframe
          src={googleDocUrl(fileUrl)}
          title={label}
          className="w-full h-[70vh] rounded-xl bg-white"
        />
      )
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-gray-50 rounded-xl text-center">
        <p className="text-sm text-gray-600">Предпросмотр для этого типа файла недоступен</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 text-sm font-medium text-white bg-[#7C5CFC] rounded-lg hover:bg-[#6B4FD6] transition"
        >
          Открыть оригинал
        </a>
      </div>
    )
  }, [fileUrl, content.content_type, fileExt, label])

  return (
    <div
      className="relative group rounded-xl overflow-hidden bg-black/5 select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
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
