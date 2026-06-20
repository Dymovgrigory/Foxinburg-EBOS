import { useEffect, useState, useRef } from 'react'
import Header from '../components/Header'
import api from '../services/api'
import { useChatSocket } from '../hooks/useChatSocket'

interface ChatRoom {
  id: number
  name: string
  type: string
  group_id?: number
  created_at: string
}

interface ChatMessage {
  id: number
  room_id: number
  sender_id: number
  sender_name?: string
  content: string
  created_at: string
  is_deleted: boolean
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages: liveMessages, connected, sendMessage } = useChatSocket(selectedRoom?.id ?? null)

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get('/chats')
        const list: ChatRoom[] = res.data.data || []
        setRooms(list)
        if (list.length > 0 && !selectedRoom) {
          setSelectedRoom(list[0])
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Ошибка загрузки чатов')
      } finally {
        setLoadingRooms(false)
      }
    }
    fetchRooms()
  }, [])

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedRoom) return
      try {
        const res = await api.get(`/chats/${selectedRoom.id}/messages`)
        setHistory((res.data.data || []).reverse())
      } catch (err: any) {
        setError(err.response?.data?.message || 'Ошибка загрузки сообщений')
      }
    }
    setHistory([])
    fetchHistory()
  }, [selectedRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, liveMessages])

  const allMessages: ChatMessage[] = [...history, ...liveMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedRoom) return
    const ok = sendMessage(input.trim())
    if (ok) {
      setInput('')
    } else {
      setError('Не удалось отправить сообщение')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <Header
        title="Чаты"
        subtitle={selectedRoom ? selectedRoom.name : 'Выберите чат'}
        icon="💬"
      />

      <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-64px-48px)]">
        {error && <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex overflow-hidden">
          {/* Sidebar rooms */}
          <div className="w-72 border-r border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100 font-bold text-gray-900">Чаты</div>
            <div className="flex-1 overflow-y-auto">
              {loadingRooms ? (
                <div className="p-4 text-center text-gray-400">Загрузка...</div>
              ) : rooms.length === 0 ? (
                <div className="p-4 text-center text-gray-400">Нет чатов</div>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={[
                      'w-full text-left px-4 py-3 text-sm font-medium transition border-b border-gray-50',
                      selectedRoom?.id === room.id
                        ? 'bg-[#E85D4C]/10 text-[#E85D4C]'
                        : 'text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {room.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedRoom ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{selectedRoom.name}</div>
                    <div className="text-xs text-gray-400">
                      {connected ? 'Подключено' : 'Подключение...'}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {allMessages.length === 0 ? (
                    <div className="text-center text-gray-400 mt-10">Нет сообщений</div>
                  ) : (
                    allMessages.map((m) => (
                      <div key={m.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 max-w-3xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900">{m.sender_name || 'Неизвестно'}</span>
                          <span className="text-xs text-gray-400">{formatTime(m.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-3">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Введите сообщение..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#E85D4C]"
                  />
                  <button
                    type="submit"
                    disabled={!connected || !input.trim()}
                    className="px-6 py-2 bg-[#E85D4C] hover:bg-[#D14F40] disabled:bg-gray-300 text-white font-medium rounded-xl transition"
                  >
                    Отправить
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">Выберите чат</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
