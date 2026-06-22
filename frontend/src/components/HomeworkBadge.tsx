import { useEffect, useState } from 'react'
import { homeworksApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function HomeworkBadge() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchCount = async () => {
      try {
        const list = await homeworksApi.list()
        const isReviewer = ['owner', 'super_admin', 'admin', 'methodist'].includes(user?.role || '')
        const filtered = isReviewer
          ? list.filter((h) => h.status === 'submitted')
          : list.filter((h) => ['assigned', 'in_progress', 'submitted'].includes(h.status))
        if (!cancelled) setCount(filtered.length)
      } catch {
        // не ломаем UI при ошибке
      }
    }
    fetchCount()
    return () => {
      cancelled = true
    }
  }, [user?.role])

  if (!count) return null
  return (
    <span className="bg-fox-gold text-fox-purple text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}
