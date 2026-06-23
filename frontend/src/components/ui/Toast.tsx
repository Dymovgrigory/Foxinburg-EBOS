import React, { createContext, useContext, useState, useCallback } from 'react'
import { LuCircleCheck, LuX, LuTriangleAlert, LuInfo, LuCircleX } from 'react-icons/lu'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const iconByType: Record<ToastType, React.ReactNode> = {
    success: <LuCircleCheck className="w-5 h-5" />,
    error: <LuCircleX className="w-5 h-5" />,
    warning: <LuTriangleAlert className="w-5 h-5" />,
    info: <LuInfo className="w-5 h-5" />,
  }

  const colorByType: Record<ToastType, string> = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-fox-purple/10 text-fox-purple border-fox-border',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-fox min-w-[280px] max-w-md',
              'transform transition-all duration-300 translate-x-0',
              colorByType[toast.type],
            ].join(' ')}
          >
            <span>{iconByType[toast.type]}</span>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-fox-gray/70 hover:text-fox-purple transition"
              aria-label="Закрыть"
            >
              <LuX size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
