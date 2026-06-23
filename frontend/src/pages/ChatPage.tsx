import { useEffect, useState, useRef } from 'react'
import { getErrorMessage } from '../utils/error'
import Header from '../components/Header'
import { useToast, Button, Card, Modal, Input, Loader, Badge, EmptyState } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useChatSocket } from '../hooks/useChatSocket'
import { chatsApi, usersApi } from '../api'
import type { ChatRoom, ChatMessage, User } from '../types'
import { LuMessageSquare } from 'react-icons/lu'

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [newRoomName, setNewRoomName] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([])
  const [creating, setCreating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages: liveMessages, connected, sendMessage } = useChatSocket(selectedRoom?.id ?? null)

  const canCreateRoom = ['owner', 'super_admin', 'admin'].includes(user?.role || '')

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const list = await chatsApi.list()
        setRooms(list)
        if (list.length > 0 && !selectedRoom) {
          setSelectedRoom(list[0])
        }
      } catch (err: unknown) {
        showToast(getErrorMessage(err, 'Ошибка загрузки чатов'), 'error')
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
        const list = await chatsApi.messages(selectedRoom.id)
        setHistory(list.reverse())
      } catch (err: unknown) {
        showToast(getErrorMessage(err, 'Ошибка загрузки сообщений'), 'error')
      }
    }
    setHistory([])
    fetchHistory()
  }, [selectedRoom])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, liveMessages])

  useEffect(() => {
    if (showCreateModal && canCreateRoom) {
      usersApi.list().then(setUsers).catch(() => setUsers([]))
    }
  }, [showCreateModal, canCreateRoom])

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
      showToast('Не удалось отправить сообщение', 'error')
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setCreating(true)
    try {
      const room = await chatsApi.create({
        name: newRoomName,
        participant_ids: selectedParticipants,
      })
      setRooms((prev) => [...prev, room])
      setSelectedRoom(room)
      setShowCreateModal(false)
      setNewRoomName('')
      setSelectedParticipants([])
      showToast('Чат создан', 'success')
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка создания чата'), 'error')
    } finally {
      setCreating(false)
    }
  }

  const toggleParticipant = (id: number) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-fox-light">
      <Header title="Чаты" subtitle={selectedRoom ? selectedRoom.name : 'Выберите чат'} icon={<LuMessageSquare />} />

      <div className="p-4 md:p-6 w-full h-[calc(100vh-64px-32px)]">
        <Card padding="none" className="h-full flex overflow-hidden">
          {/* Rooms sidebar */}
          <div className="w-72 border-r border-fox-border/50 flex flex-col">
            <div className="p-4 border-b border-fox-border/50 flex items-center justify-between">
              <div className="font-bold text-fox-dark">Чаты</div>
              {canCreateRoom && (
                <Button size="sm" onClick={() => setShowCreateModal(true)} leftIcon="+">
                  Новый
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingRooms ? (
                <Loader text="Загрузка..." size="sm" />
              ) : rooms.length === 0 ? (
                <p className="p-4 text-sm text-fox-gray/70 text-center">Нет чатов</p>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={[
                      'w-full text-left px-3 py-3 rounded-xl text-sm font-medium transition',
                      selectedRoom?.id === room.id
                        ? 'bg-fox-purple text-white shadow-sm'
                        : 'text-fox-graphite hover:bg-fox-light',
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
                <div className="p-4 border-b border-fox-border/50 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-fox-dark">{selectedRoom.name}</div>
                    <div className="text-xs text-fox-gray/70">
                      {connected ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Подключено
                        </span>
                      ) : (
                        'Подключение...'
                      )}
                    </div>
                  </div>
                  <Badge variant={connected ? 'success' : 'warning'} size="sm">
                    {connected ? 'online' : 'connecting'}
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-fox-light/50">
                  {allMessages.length === 0 ? (
                    <div className="text-center text-fox-gray/70 mt-10">Нет сообщений</div>
                  ) : (
                    allMessages.map((m) => {
                      const isMe = m.sender_id === user?.id
                      return (
                        <div
                          key={m.id}
                          className={[
                            'max-w-[80%] p-3 rounded-2xl text-sm',
                            isMe
                              ? 'ml-auto bg-fox-purple text-white rounded-br-none'
                              : 'bg-white border border-fox-border/50 rounded-bl-none',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={['text-xs font-bold', isMe ? 'text-fox-gold' : 'text-fox-purple'].join(' ')}>
                              {m.sender_name || 'Неизвестно'}
                            </span>
                            <span className={['text-[10px]', isMe ? 'text-white/70' : 'text-fox-gray/70'].join(' ')}>
                              {formatTime(m.created_at)}
                            </span>
                          </div>
                          <p className={['whitespace-pre-wrap', isMe ? 'text-white/90' : 'text-fox-graphite'].join(' ')}>
                            {m.content}
                          </p>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-4 border-t border-fox-border/50 flex gap-3 bg-white">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Введите сообщение..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!connected || !input.trim()}>
                    Отправить
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-fox-gray/70">
                <EmptyState icon={<LuMessageSquare />} title="Выберите чат" description="Или создайте новый, чтобы начать общение." />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Create room modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Новый чат"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Отмена</Button>
            <Button type="submit" form="chat-form" loading={creating}>Создать</Button>
          </>
        }
      >
        <form id="chat-form" onSubmit={handleCreateRoom} className="grid gap-4">
          <Input
            label="Название чата"
            required
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-fox-graphite mb-2">Участники</label>
            <div className="max-h-48 overflow-y-auto space-y-2 border border-fox-border/50 rounded-xl p-3">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm text-fox-graphite cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(u.id)}
                    onChange={() => toggleParticipant(u.id)}
                    className="rounded border-fox-border text-fox-purple focus:ring-fox-gold"
                  />
                  {u.name} <span className="text-fox-gray/70">({u.email})</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
