
interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
}

export default function Loader({ size = 'md', text, fullScreen = false }: LoaderProps) {
  const spinner = (
    <div
      className={[
        'rounded-full border-fox-gold border-t-transparent animate-spin',
        sizeClasses[size],
      ].join(' ')}
    />
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur">
        {spinner}
        {text && <p className="mt-4 text-sm text-gray-600 font-medium">{text}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {spinner}
      {text && <p className="mt-3 text-sm text-gray-500">{text}</p>}
    </div>
  )
}
