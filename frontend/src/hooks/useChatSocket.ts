import { useEffect, useRef, useState, useCallback } from 'react'

interface ChatMessage {
  id: number
  room_id: number
  sender_id: number
  sender_name?: string
  content: string
  created_at: string
  updated_at?: string
  is_deleted: boolean
}

const RECONNECT_DELAY = 2000
const MAX_RECONNECT_ATTEMPTS = 5

export function useChatSocket(roomId: number | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!roomId) return
    const token = localStorage.getItem('token')
    if (!token) {
      setError('Необходима авторизация')
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    const url = `${protocol}://${host}/api/v3/ws/chats/${roomId}?token=${token}`

    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.onopen = () => {
      setConnected(true)
      setError(null)
      reconnectAttempts.current = 0
    }

    socket.onmessage = (event) => {
      try {
        const msg: ChatMessage = JSON.parse(event.data)
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      } catch {
        // ignore malformed messages
      }
    }

    socket.onerror = () => {
      setError('Ошибка соединения')
    }

    socket.onclose = () => {
      setConnected(false)
      socketRef.current = null
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY * reconnectAttempts.current)
      }
    }
  }, [roomId])

  useEffect(() => {
    setMessages([])
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (socketRef.current) {
        socketRef.current.onclose = null
        socketRef.current.close()
      }
    }
  }, [connect])

  const sendMessage = useCallback((content: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ content }))
      return true
    }
    return false
  }, [])

  return { messages, setMessages, connected, error, sendMessage }
}
