import { useEffect, useState } from 'react'
import api from '../services/api'

export default function NotificationBadge() {
  const [count, setCount] = useState(0)

  const fetchCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count')
      setCount(res.data.data?.count || 0)
    } catch {
      setCount(0)
    }
  }

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-[#E85D4C] rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  )
}
