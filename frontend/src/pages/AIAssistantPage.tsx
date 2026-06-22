import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header'
import { useToast, Card, Button, Input } from '../components/ui'
import { aiApi } from '../api'
import { getErrorMessage } from '../utils/error'
import { LuBot } from 'react-icons/lu'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function AIAssistantPage() {
  const { showToast } = useToast()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Привет! Я AI-помощник FOXINBURG EBOS. Задайте вопрос по платформе, Академии педагогов, расписанию или домашним заданиям.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const context = messages.map((m) => `${m.role}: ${m.text}`).join('\n')
      const res = await aiApi.ask({ message: text, context })
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }])
    } catch (err: unknown) {
      showToast(getErrorMessage(err, 'Ошибка AI-помощника'), 'error')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Не удалось получить ответ. Попробуйте позже.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen bg-fox-light flex flex-col">
      <Header title="AI Помощник" icon={<LuBot />} />

      <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden min-h-[500px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={[
                  'flex',
                  m.role === 'user' ? 'justify-end' : 'justify-start',
                ].join(' ')}
              >
                <div
                  className={[
                    'max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-fox-purple text-white rounded-br-none'
                      : 'bg-fox-light text-fox-purple rounded-bl-none',
                  ].join(' ')}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-fox-light text-fox-purple rounded-2xl rounded-bl-none px-4 py-3 text-sm flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-fox-gold border-t-transparent rounded-full animate-spin" />
                  <span>Думаю...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-fox-border p-4">
            <div className="flex gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите вопрос..."
                className="flex-1"
                disabled={loading}
              />
              <Button onClick={handleSend} disabled={loading || !input.trim()}>
                Отправить
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
