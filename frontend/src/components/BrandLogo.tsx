interface BrandLogoProps {
  collapsed?: boolean
  className?: string
  darkText?: boolean
}

export default function BrandLogo({ collapsed = false, className = '', darkText = false }: BrandLogoProps) {
  return (
    <div className={['flex items-center gap-3', className].join(' ')}>
      <div className="w-10 h-10 rounded-xl bg-fox-gold flex items-center justify-center flex-shrink-0 shadow-sm">
        <svg
          width="28"
          height="28"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Лисёнок FOXINBURG"
        >
          {/* Академическая шапочка */}
          <path
            d="M14 18L24 10L34 18L32 22H16L14 18Z"
            fill="#3A2953"
          />
          <rect x="22" y="8" width="4" height="4" rx="1" fill="#3A2953" />
          {/* Мордочка */}
          <ellipse cx="24" cy="30" rx="14" ry="12" fill="#3A2953" />
          {/* Уши */}
          <path d="M12 20L8 10L18 16L12 20Z" fill="#3A2953" />
          <path d="M36 20L40 10L30 16L36 20Z" fill="#3A2953" />
          {/* Глаза */}
          <circle cx="19" cy="28" r="2.5" fill="#F5ED75" />
          <circle cx="29" cy="28" r="2.5" fill="#F5ED75" />
          {/* Нос */}
          <circle cx="24" cy="33" r="2" fill="#F5ED75" />
          {/* Улыбка */}
          <path
            d="M20 36C20 36 22 39 24 39C26 39 28 36 28 36"
            stroke="#F5ED75"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {!collapsed && (
        <div>
          <div className={`font-bold leading-tight ${darkText ? 'text-fox-purple' : 'text-white'}`}>FOXINBURG</div>
          <div className={`text-[10px] tracking-wider font-semibold ${darkText ? 'text-fox-purple/60' : 'text-fox-gold/80'}`}>EBOS</div>
        </div>
      )}
    </div>
  )
}
