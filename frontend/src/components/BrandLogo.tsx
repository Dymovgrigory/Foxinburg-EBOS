interface BrandLogoProps {
  collapsed?: boolean
  variant?: 'auto' | 'light' | 'dark'
  className?: string
}

export default function BrandLogo({
  collapsed = false,
  variant = 'auto',
  className = '',
}: BrandLogoProps) {
  const isDarkText = variant === 'auto' || variant === 'light'
  const textColorClass =
    variant === 'dark'
      ? 'text-white'
      : variant === 'light'
        ? 'text-fox-purple'
        : 'text-fox-purple dark:text-white'

  if (collapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10"
          aria-label="FOXINBURG"
        >
          <circle cx="20" cy="20" r="20" fill="#1c0e36" />
          <path
            d="M12 18c0-3.5 2.5-6 6-6h4c3.5 0 6 2.5 6 6v2c0 3.5-2.5 6-6 6h-4c-3.5 0-6-2.5-6-6v-2z"
            fill="#F5ED75"
          />
          <path
            d="M10 14l4 2-1.5 3L10 14zM30 14l-4 2 1.5 3L30 14z"
            fill="#F5ED75"
          />
          <circle cx="17" cy="20" r="1.5" fill="#1c0e36" />
          <circle cx="23" cy="20" r="1.5" fill="#1c0e36" />
          <path
            d="M18 24c1 0.8 3 0.8 4 0"
            stroke="#1c0e36"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M14 12l6-3 6 3"
            stroke="#F5ED75"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="18" y="8" width="4" height="3" rx="1" fill="#F5ED75" />
        </svg>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-9 h-9 flex-shrink-0"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="20" fill="#1c0e36" />
        <path
          d="M12 18c0-3.5 2.5-6 6-6h4c3.5 0 6 2.5 6 6v2c0 3.5-2.5 6-6 6h-4c-3.5 0-6-2.5-6-6v-2z"
          fill="#F5ED75"
        />
        <path
          d="M10 14l4 2-1.5 3L10 14zM30 14l-4 2 1.5 3L30 14z"
          fill="#F5ED75"
        />
        <circle cx="17" cy="20" r="1.5" fill="#1c0e36" />
        <circle cx="23" cy="20" r="1.5" fill="#1c0e36" />
        <path
          d="M18 24c1 0.8 3 0.8 4 0"
          stroke="#1c0e36"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M14 12l6-3 6 3"
          stroke="#F5ED75"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="18" y="8" width="4" height="3" rx="1" fill="#F5ED75" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span
          className={`font-display font-bold tracking-tight text-lg ${textColorClass}`}
        >
          FOXINBURG
        </span>
        <span
          className={`text-[10px] font-medium tracking-wide uppercase ${
            isDarkText ? 'text-fox-gray-light dark:text-fox-gray' : 'text-white/70'
          }`}
        >
          EBOS
        </span>
      </div>
    </div>
  )
}
